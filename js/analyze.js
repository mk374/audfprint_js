// Constants for Analyzer
// # DENSITY controls the density of landmarks found (approx DENSITY per sec)
let DENSITY = 20.0;
// # OVERSAMP > 1 tries to generate extra landmarks by decaying faster
let OVERSAMP = 1;
// # 512 pt FFT @ 11025 Hz, 50% hop
// # t_win = 0.046
// # t_hop = 0.0232
// # Just specify n_fft
let N_FFT = 512;
let N_HOP = 256;
// # spectrogram enhancement
let HPF_POLE = 0.98;

// # Globals defining packing of landmarks into hashes
let F1_BITS = 8;
let DF_BITS = 6;
let DT_BITS = 6;
// # derived constants
let B1_MASK = (1 << F1_BITS) - 1;
let B1_SHIFT = DF_BITS + DT_BITS;
let DF_MASK = (1 << DF_BITS) - 1;
let DF_SHIFT = DT_BITS;
let DT_MASK = (1 << DT_BITS) - 1;

/**
 * Returns local maximum's indices in nj.array format
 * @param {1-D nj.array} vec 
 */
function locmax(vec) {
   var indices = [];
   if (vec[0] > vec[1]) {
       indices.push(0);
   }
   for (let i=1; i < vec.length - 1; i++) {
       if (vec[i-1] <= vec[i] && vec[i+1] < vec[i]) {
           indices.push(i);
       }
   }
   if (vec[vec.length-1] > vec[vec.length-2]) {
       indices.push(vec.length-1);
   }
   return nj.array(indices);
}

// These are used in the threshold functions
/**
 * Zip two arrays togeter
 * @param  {Array} arrays the two arrays are in the format[array1, array2]
 * @return {Array} the zipped arrays
 */
function zip(arrays) {
    return Array.apply(null,Array(arrays[0].length)).map(function(_,i){
        return arrays.map(function(array){return array[i]})
    });
};
//used for sorting // reverse = True
/**
 * A Comparator funciton
 * @param  {Number} a The first number
 * @param  {Number} b The second number
 * @return {Number} the resulting comparison
 */
function Comparator(a, b) {
	if (a[0] > b[0]) return -1;
	if (a[0] < b[0]) return 1;
	if (a[0] === b[0]){
		if (a[1] > b[1]){
			return -1
		}
		if (a[1] < b[1]){
			return 1
		}
	}
	return 0;
};

//override elements in arr1 with correspoinding elements in arr2 if smaller: sub np.maximum()
/**
 * Override elements in arr1 with correspoinding elements in arr2 if arr1<arr2
 * @param {nj.array} arr1 
 * @param {nj.array} arr2 
 */
function max_override(arr1, arr2) {
    arr1 = arr1.tolist();
    arr2 = arr2.tolist();
    for (let i=0; i<arr1.length; i++) {
        if (arr1[i]<arr2[i]) {
            arr1[i]=arr2[i];
        }
    }
    return nj.array(arr1);
}

/**
 * Get elements pf arr1 indicated by indices on arr2 
 * @param {nj.array} arr1 
 * @param {nj.array} arr2 
 * @return {nj.array} return the array 
 */
function getArray(arr1, arr2) {
    arr2 = arr2.tolist();
    var temp = [];
    for (let i=0; i<arr2.length; i++) {
        temp.push(arr1.get(arr2[i]));
    }
    return nj.array(temp);
}
/**
 * Convert a list of (time, bin1, bin2, dtime) landmarks
    into a list of (time, hash) pairs where the hash combines
    the three remaining values.
 * @param {Array} landmarks The list of (time, bin1, bin2, dtime)
 * @return {nj.array} (time,hash) pairs
 */
function landmarks2hashes(landmarks){
    let landmarks = nj.array(landmarks);
    
    //deal with special case of empty landmarks
    if (landmarks.shape[0] == 0){
        return nj.zeros([0,2], 'int32');
    }
    let hashes = nj.zeros([landmarks.shape[0], 2], 'int32');
    for (let i = 0; i < landmarks.shape[0]; i++){
        hashes.set(i, 0, landmarks.get(i,0))
    }
    //first item of the or byte operator
    for (let j = 0; j < landmarks.shape[0]; i ++){
        let temp1 = landmarks.get(j, 1) & B1_MASK;
        temp1 = temp1 << B1_SHIFT;
        let temp2 = landmarks.get(j, 2) - landmarks.get(j, 1);
        temp2 = temp2 & DF_MASK;
        temp2 = temp2 << DF_SHIFT;
        let temp3 = landmarks.get(j, 3) & DT_MASK;
        hashes.set(j,1,(temp1|temp2|temp3));        
    }
    
    return hashes;
}

class Analyzer {
    constructor(density=DENSITY) {
            this.density = density
            this.target_sr = 11025
            this.n_fft = N_FFT
            this.n_hop = N_HOP
            this.shifts = 1
            // # how wide to spreak peaks
            this.f_sd = 30.0
            // # Maximum number of local maxima to keep per frame
            this.maxpksperframe = 5
            // # Limit the num of pairs we'll make from each peak (Fanout)
            this.maxpairsperpeak = 3
            // # Values controlling peaks2landmarks
            // # +/- 31 bins in freq (LIMITED TO -32..31 IN LANDMARK2HASH)
            this.targetdf = 31
            // # min time separation (traditionally 1, upped 2014-08-04)
            this.mindt = 2
            // # max lookahead in time (LIMITED TO <64 IN LANDMARK2HASH)
            this.targetdt = 63
            // # global stores duration of most recently-read soundfile
            this.soundfiledur = 0.0
            // # .. and total amount of sound processed
            this.soundfiletotaldur = 0.0
            // # .. and count of files
            this.soundfilecount = 0
            // # Control behavior on file reading error
            this.fail_on_error = true
            this.__sp_width = null;
            this.__sp_len = null;
            this.__sp_vals = [];
    }

    /**
     * Create a blurred version of vector, where each of the local maxes 
     * is spread by a gaussian with SD <width>.
     * @param {nj.array} vector 
     * @param {number} width 
     */
    spreadpeaksinvector(vector, width=4.0) {
        //yet to be tested
        vector = vector.tolist();
        var npts = vector.length;
        var peaks = locmax(vector);
        return this.spreadpeaks(peaks, nj.array(vector), npts, width);
    }

    /**
     * Generate a vector consisting of the max of a set of Gaussian bumps
     * @param {1-D nj.array} peaks list of (index, value) pairs giving the center point and height
        of each gaussian
     * @param {1-D nj.array} vector Magnitude vector
     * @param {number} npoints the length of the output vector (needed if base not provided)
     * @param {number} width the half-width of the Gaussians to lay down at each point
     * @param {nj.array} base optional initial lower bound to place Gaussians above
     */
    spreadpeaks(peaks, vector, npoints=null, width=4.0, base=null) {
        // yet to be tested
        //assume it to be an array of arrays
        if (base === null) {
            var vec = nj.zeros([1, npoints]);
        }
        else {
            npoints = base.length;
            var vec = base.clone();
        }
        
        if (width!==this.__sp_width || npoints!==this.__sp_len) {
            this.__sp_len = npoints;
            this.__sp_width = width;
            this.__sp_vals = nj.exp((nj.arange(-npoints, npoints + 1).divide(width)).pow(2).multiply(-0.5));  //NEED TO BE FIXED
        }
        for (let i=0; i<peaks.length; i++) {
            let val = vector.get(peaks.get(i));
            vec = max_override(vec, getArray(this.__sp_len_vals, nj.arange(npoints).add(npoints-pos)).multiply(val));
        }
        return vec;
    }

    /**
     * forward pass of findpeaks initial threshold envelope based on peaks in first 10 frames
     * @param {nj.array} sgram 
     * @param {number} a_dec 
     */
    _decaying_threshold_fwd_prune(sgram, a_dec) {
        //Yet to be tested
        var srows = sgram.shape[0];
        var scols = sgram.shape[1];
        let max_array = [];
        var sgram_temp = sgram.slice(null, [0, Math.min(10,scols)]);
        for (let i=0; i<srows; i++) {
            let row_max = sgram_temp.slice([i,i+1], null).max();
            max_array.push(row_max);
        }
        max_array = nj.array(max_array);
        var sthresh = self.spreadpeaksinvector(max_array, this.f_sd);
        var peaks = nj.zeros([srows, scols]);

        let __sp_pts = len(sthresh);
        let __sp_v = this.__sp_vals;

        for(let i =0; i<scols; i++) {
            var s_col = sgram.slice(null, [i,i+1]);
            var sdmax_temp = locmax(s_col);
            var sdmaxposs = [];  //keeps track of indices of peaks above threshold
            for (let j=0; j<sdmax_temp.shape[0]; j++) {
                if (s_col.get(sdmax_temp.get(j)) > sthresh.get(sdmax_temp.get(j))) {
                    sdmaxposs.push(sdmax_temp.get(j));
                }
            }
            //add magnitudes to each index in sdmaxposs for sorting purpose
            for (let k=0; k<sdmaxposs.length; k++) {
                sdmaxposs[k] = [sdmaxposs[k], s_col[sdmaxposs[k]]];
            }
            // this sorts in reverse order of magnitudes
            sdmaxposs = sdmaxposs.sort(function(a, b){return (b[1]-a[1])});

            //change back to array of indices after sorting
            for (let k=0; k<sdmaxposs.length; k++) {
                sdmaxposs[k] = sdmaxposs[k][0];
            }

            for (let m =0; m<this.maxpksperframe; m++) {
                sthresh = max_override(sthreshold, __sp_v.slice([(__sp_pts - sdmaxposs[m]), (2 * __sp_pts - sdmaxposs[m])]).multiply(s_cols.get(sdmaxposs[m])));
                peaks.set(sdmaxposs[m], i, 1);
            }
            sthresh = sthresh.multiply(a_dec);
        }
        return peaks;
    }

    /**
     * backwards pass of findpeaks
     * @param {nj.array} sgram 
     * @param {nj.array} peaks 
     * @param {number} a_dec 
     */
    _decaying_threshold_bwd_prune_peaks(sgram, peaks, a_dec) {
        //yet to be tested
        let scols = sgram.shape[1];
        //backwards filter to rpune peaks
        //sthresh gets the last column of each row
        let sthresh = spreadpeaksinvector(sgram.slice(null, -1).reshape(1,sgram.shape[0]));
        for (let col = scols; col > 0; col --){
            // pkposs = np.nonzero(peaks[:, col-1])[0]

            let pkposs_nj = peaks.slice(null, [col-1, col]);
            let pkposs = [];
            for (let i = 0; i < pkposs_nj.size; i ++){
                if (pkposs_nj.get(i,0) > 0){
                    pkposs.push(i);
                }
            }
            
            //peakvals = sgram[pkposs, col-1]
            //check if peakvals is one dimensional (i.e (1,x))
            let peakvals = [];
            for (let i = 0; i < pkposs.size; i ++){
                let temp = sgram.get(pkposs.get(i), col-1);
                peakvals.push(temp);
            }
            
            // peakvals and pkposs should be the same length
            let zip = zip(peakvals, pkposs);
            
            // this is not a numjs array
            var bigArray = zip.sort(Comparator);

            for (let j = 0; j < bigArray.length; j ++){
                let val = bigArray[j][0];
                let peakpos = bigArray[j][1];
                if (val >= sthresh[peakpos]){
                    //based on assumption that spreadpeaks takes in
                    //array of arrays as an input

        //ask about spreadpeaks......
                    sthresh = spreadpeaks([[peakpos, val]], base=sthresh, width=this.f_sd)
                    if (col < scols){
                        peaks.set(peakpos, col,0);
                    }
                }
                else{
                    peaks.set(peakpos, col - 1,0);
                }
            }
            sthresh = sthresh.multiply(a_dec);
 
        }
        return peaks;

    }

    /**
     * Find the local peaks in the spectrogram as basis for fingerprints.
        Returns a list of (time_frame, freq_bin) pairs.
     * @param {array} d Input waveform as 1D vector
     * @param {number} sr Sampling rate of d (not used)
     * @return {nj.array}    Ordered list of landmark peaks found in STFT.  First value of
            each pair is the time index (in STFT frames, i.e., units of
            n_hop/sr secs), second is the FFT bin (in units of sr/n_fft
            Hz).
     */
    findpeaks(d, sr=11025){
        if (d.length == 0){
            return [];
        }
        var a_dec = Math.pow((1 - 0.01 * (this.density * 
            nj.sqrt(this.n_hop / 352.8).get(0) / 35)),(1 / OVERSAMP));
        
        var mywin = [];
        for (let i = 0; i < this.n_fft + 2; i ++){
            mywin.push(hann(i,this.n_fft + 2));
        }
        var mywin = nj.array(mywin);
        mywin = mywin.slice([1,-1]);
        //！！！！！！！！have to do the conversion first!!!!!!!!!
        var sgram = stft(d, this.n_fft, this.n_hop, mywin);
        var sgrammax = nj.max(sgram);
        if (sgrammax > 0.0) {
            let para = sgrammax / 1e6;
            //serve as np.maximum
            for (let i=0; i<sgram.shape[0]; i++) {
                for (let j=0; j<sgram.shape[1]; j++) {
                    if (sgram.get(i,j) < para) {
                        sgram.set(i, j, para);
                    }
                }
            }
            sgram = sgram.subtract(sgram.mean());
        } else {
            alert("Warning: input signal is identically zero.")
        }
        
        var peaks = this._decaying_threshold_fwd_prune(sgram, a_dec);
        peaks = this. _decaying_threshold_bwd_prune_peaks(sgram, peaks, a_dec);

        var scols = nj.shape(sgram)[1];
        var pklist = [];
        for (let i=0; i<scols; i++) {
            var peaks_temp = peaks.slice(null, [i, i+1]);
            for (let j=0; j<peaks_temp.shape[0]; j++) {
                if (peaks_temp.get(j) !== 0) {
                    pklist.push([i,j]);
                }
            }
        }
        return nj.array(pklist);
    }

    /**
     * Take a list of local peaks in spectrogram
        and form them into pairs as landmarks.
        pklist is a column-sorted list of (col, bin) pairs as created
        by findpeaks().
     * @param {nj.array} pklist 
     * @return {nj.array}  a list of (col, peak, peak2, col2-col) landmark descriptors.

     */
    peaks2landmarks(pklist) {
        var landmarks = [];
        pklist = pklist.tolist();
        if (pklist.shape[0] > 0) {
            //Find column of the final peak in the list
            var scols = pklist[-1][0] + 1;

        }
    }
}