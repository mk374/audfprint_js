/**
 * Returns rfft with array instead of complex number
 * @param {the input array} a 
 */
// function rfft(a){
//     let len=a.length;
//     var rfft=[];
//     for(i=0; i<len; i++){
//         rfft[i]=[];
//         //create an array to do fft on
//         var temp=[[]];
//         //length of row
//         var l=a[i].length;
//         for(j=0; j<l; j++){
//             temp[j]=[a[i][j],0];
//         }
//         var fft=nj.fft(temp);
//         l=fft.shape[0];
//         var index=0;
//         //transfer all valid results into the rfft array
//         for(j=0; j<l; j++){
//             if(fft.get(j,1)>=0){ //if imaginary parts are nonnegative keep them
//                 rfft[i][index]=[];
//                rfft[i][index][0]=fft.get(j,0);
//                rfft[i][index][1]=fft.get(j,1);
//                index++;
//             }
//         }
//     }
//     return rfft;
// }
function rfft(a){
    let len=a.length;
    var rfft=[];
    for(i=0; i<len; i++){
        rfft[i]=[];
        //create an array to do fft on
        var temp=[[]];
        //length of row
        var l=a[i].length;
        for(j=0; j<l; j++){
            temp[j]=[a[i][j],0];
        }
        var fft=nj.fft(temp);
        l=fft.shape[0];
        var index=0;
        //transfer all valid results into the rfft array
        for(j=0; j<l; j++){
            if(fft.get(j,1)>=0){ //if imaginary parts are nonnegative keep them
                rfft[i][index]=new Complex(fft.get(j,0),fft.get(j,1));
                index++;
            }
        }
    }
    return rfft;
}
/**
 * runs rfft and returns magnitude of complex numbers instead of complex numbers
 * @param {the array to execute rfft on} a 
 */
function rfftMagnitude(a){
    let len=a.length;
    var rfft=[];
    for(i=0; i<len; i++){
        rfft[i]=[];
        //create an array to do fft on
        var temp=[[]];
        //length of row
        var l=a[i].length;
        for(j=0; j<l; j++){
            temp[j]=[a[i][j],0];
        }
        var fft=nj.fft(temp);
        l=fft.shape[0];
        var index=0;
        //transfer all valid results into the rfft array
        for(j=0; j<l; j++){
            if(fft.get(j,1)>=0){ //if imaginary parts are nonnegative keep them
                rfft[i][index]=Math.sqrt(fft.get(j,1)*fft.get(j,1)+fft.get(j,0)*fft.get(j,0));
                index++;
            }
        }
    }
    return nj.array(rfft);
}
function printComplex(a){
    var s=new String("");
    for(i=0; i<a.length; i++){
        for(j=0; j<a[i].length; j++){
            s+=(a[i][j][0]+"+"+a[i][j][1]+"i, ");
        }
        s+="\n";
    }
    return s;
}
