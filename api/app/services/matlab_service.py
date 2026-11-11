from pathlib import Path
import threading

import matlab
import matlab.engine
import numpy as np


class MatlabService:
    def __init__(self):
        self.engine = None
        self.lock = threading.Lock()

        # Resolve the MATLAB folder relative to the project
        self.matlab_dir = (
            Path(__file__).resolve().parents[2] / "matlab"
        )

    def start(self):
        if self.engine is not None:
            return

        self.engine = matlab.engine.start_matlab(
            "-nodesktop -nosplash"
        )

        # Add the folder containing your .m files
        self.engine.addpath(
            str(self.matlab_dir),
            nargout=0,
        )

        print("MATLAB Engine started")

    def process_audio(
        self,
        audio: np.ndarray,
        zi: np.ndarray,
        cutoff: float,
        sample_rate: int,
    ) -> np.ndarray:

        if self.engine is None:
            raise RuntimeError("MATLAB Engine is not running")

        # Convert NumPy array to a MATLAB column vector
        audio = np.asarray(audio, dtype=np.float64).reshape(-1, 1)
        matlab_audio = matlab.double(audio.tolist())
        if zi is None:
            matlab_zi = matlab.double([])
        else:
            matlab_zi = matlab.double(
                np.asarray(zi).reshape(-1, 1).tolist()
            )

        # Call lowpass_audio.m
        with self.lock:
            result, updated_zi = self.engine.lowpass_audio(
                matlab_audio,
                matlab_zi,
                cutoff,
                float(sample_rate),
                nargout=2,
            )

        # Convert MATLAB result back to NumPy
        processed_audio = np.asarray(result, dtype=np.float32).reshape(-1)
        updated_zi = np.asarray(updated_zi, dtype=np.float64).reshape(-1)

        return processed_audio, updated_zi

    def stop(self):
        if self.engine is not None:
            self.engine.quit()
            self.engine = None
            print("MATLAB Engine stopped")