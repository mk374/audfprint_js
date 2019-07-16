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


function hann (i,N) {
    return 0.5*(1 - Math.cos(2 * Math.PI * i/(N-1)))
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


            
        console.log('hello');


    }
}
