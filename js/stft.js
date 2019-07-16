



function frame(data, window_length, hop_length){
    // let num_samples = data.shape[0];
    // let num_frames = 1 + (Math.floor((num_samples - window_length) / hop_length));
    // const shape = [num_frames, window_length]; //implementation is a bit different
    // //but should be fine

    let num_frames = 1 + Math.floor((data.size - window_length) / hop_length)
    // let x_framed_overlap = nj.zeros([num_frames, window_length], 'float32')
    let x_framed_overlap = nj.zeros([num_frames, window_length], 'float32')
    for (let t = 0; t < num_frames; t++){
        for (let i = 0; i < window_length; i++){
            x_framed_overlap.set(t, i, data.get(t*hop_length + i))
        }
    }
    
    return x_framed_overlap

}

//create a hanning window that is required for fft
function hann (i,N) {
    return 0.5*(1 - Math.cos(2 * Math.PI * i/(N-1)));
}

//Serve as np.pad('reflect')
function pad_reflect(input_arr, num) {
    let front_pad = input_arr.slice([1, num+1, -1]).tolist();
    let back_pad = input_arr.slice([-num-1, -1, -1]).tolist();
    input_arr = input_arr.tolist();
    input_arr = front_pad.concat(input_arr, back_pad);
    return nj.array(input_arr);
}

function stft(signal, n_fft, hop_length=null, window=null){
    /*
        Calculate the short-time Fourier Transform.
    */
    if (window === null) {
        window = n_fft;
    }
    //if window is a number, need to convert window length into actual window
    if (typeof(window) === "number") {
        var mywin = [];
        for (let i = 0; i < this.n_fft + 2; i ++){
            mywin.push(hann(i,this.n_fft + 2));
        }
        var window = nj.array(mywin);
    }
   
    let window_length = mywin.length;
    signal = pad_reflect(signal, Math.floor(n_fft/2));

    frames = frame(signal, window_length, hop_length);

    for(let i=0; i<window.shape[0]; i++) {
        for (let j=0; j<window.shape[1]; j++) {
            frames.set(i, j, frames.get(i, j) * window.get(j));
        }
    }
    return rfftMagnitude(frames).T;

}


