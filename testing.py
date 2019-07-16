import numpy as np
def periodic_hann(window_length):
  """Calculate a "periodic" Hann window.

  The classic Hann window is defined as a raised cosine that starts and
  ends on zero, and where every value appears twice, except the middle
  point for an odd-length window.  Matlab calls this a "symmetric" window
  and np.hanning() returns it.  However, for Fourier analysis, this
  actually represents just over one cycle of a period N-1 cosine, and
  thus is not compactly expressed on a length-N Fourier basis.  Instead,
  it's better to use a raised cosine that ends just before the final
  zero value - i.e. a complete cycle of a period-N cosine.  Matlab
  calls this a "periodic" window. This routine calculates it.

  Args:
    window_length: The number of points in the returned window.

  Returns:
    A 1D np.array containing the periodic hann window.
  """

  return 0.5 - (0.5 * np.cos(2 * np.pi / window_length *
                             np.arange(window_length)))



def frame(data, window_length, hop_length):
  """Convert array into a sequence of successive possibly overlapping frames.

  An n-dimensional array of shape (num_samples, ...) is converted into an
  (n+1)-D array of shape (num_frames, window_length, ...), where each frame
  starts hop_length points after the preceding one.

  This is accomplished using stride_tricks, so the original data is not
  copied.  However, there is no zero-padding, so any incomplete frames at the
  end are not included.

  Args:
    data: np.array of dimension N >= 1.
    window_length: Number of samples in each frame.
    hop_length: Advance (in samples) between each window.

  Returns:
    (N+1)-D np.array with as many rows as there are complete frames that can be
    extracted.
  """
  num_samples = data.shape[0]
  num_frames = 1 + ((num_samples - window_length) // hop_length)
  shape = (num_frames, window_length) + data.shape[1:]
  
  strides = (data.strides[0] * hop_length,) + data.strides

  # print(np.lib.stride_tricks.as_strided(data, shape=shape, strides=strides)[1])
  # print(data[512:1024] == np.lib.stride_tricks.as_strided(data, shape=shape, strides=strides)[1])
  shape2 = (len(data) // window_length, window_length)

  num_frames2 = 1 + (len(data) - window_length) // hop_length
  x_framed_overlap = np.zeros((num_frames2, window_length), dtype = 'float32')

  for t in range(num_frames2):
    x_framed_overlap[t, :] = data[t*hop_length: t*hop_length + window_length]

  # data2 = data[:(len(data)//window_length)*window_length]
  # data2 = np.reshape(data2, (shape2[0], shape2[1]))
  # return data2
  print(x_framed_overlap.size)
  return x_framed_overlap

f = open("people.txt", "r")
n = []
for x in f:
  n.append(int(x))
n = np.array(n)
print(n.size, n.shape)
print(frame(n, 512, 256))