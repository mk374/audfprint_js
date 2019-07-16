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

function locmax(vec) {
    var indices = [];
    if (vec[0] > vec[1]) {
        indices.push(0);
    }
    for (let i=1; i < vec.length - 1; i++) {
        if (vec[i-1] <= vec[0] && vec[i+1] > vec[i]) {
            indices.push(i);
        }
    }
    if (vec[vec.length-1] > vec[vec.length-2]) {
        indices.push(vec.length-1);
    }
    return nj.array(indices);
 }

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

function getArray(arr1, arr2) {
    arr2 = arr2.tolist();
    var temp = [];
    for (let i=0; i<arr2.length; i++) {
        temp.push(arr1.get(arr2[i]));
    }
    return nj.array(temp);
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

    spreadpeaksinvector(vector, width=4.0) {
        //yet to be tested
        vector = vector.tolist();
        var npts = vector.length;
        var peaks = locmax(vector);
        return this.spreadpeaks(peaks, nj.array(vector), npts, width);
    }

    spreadpeaks(peaks, vector, npoints=null, width=4.0, base=null) {
        // yet to be tested
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
                // i think the above line is wrong
                //it should be: var s_col = sgram.slice(null,i)???
                //don't know CHECK
                var sdmax_temp = locmax(s_col);
                var sdmaxposs = [];
                for (let j=0; j<sdmax_temp.shape[0]; j++) {
                    if (s_col.get(sdmax_temp.get(j)) > sthresh.get(sdmax_temp.get(j))) {
                        sdmaxposs.push(sdmax_temp.get(j));
                    }
                }
                
            }

    }

    _decaying_threshold_bwd_prune_peaks(sgram, peaks,a_dec) {
        //yet to be tested
        let scols = sgram.shape[1];
        //backwards filter to rpune peaks
        //sthresh gets the last column of each row
        let sthresh = spreadpeaksinvector(sgram.slice(null, -1).reshape(1,sgram.shape[0]));
        for (let col = scols; col > 0; col --){
            let pkposs = 2;

        }

    }

    findpeaks(d,sr=11025){
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

            
        }
    
        


    }
}