import numpy as np
from scipy.signal import iirpeak, sosfilt


class AudioFilter:
    def __init__(self, sample_rate: int):
        self.sample_rate = sample_rate
        self.sos = None
        self.zi = None

    def configure(self, config: dict):
        filter_type = config.get("filterType")

        if filter_type == "peaking":
            self._configure_peaking(
                frequency=float(config["frequency"]),
                gain_db=float(config["gainDb"]),
                q=float(config["q"]),
            )

        elif filter_type == "lowpass":
            self._configure_lowpass(
                frequency=float(config["frequency"]),
            )

        elif filter_type == "highpass":
            self._configure_highpass(
                frequency=float(config["frequency"]),
            )

        else:
            raise ValueError("Unsupported filter type")

    def _configure_peaking(self, frequency, gain_db, q):
        from scipy.signal import iirpeak

        if not (0 < frequency < self.sample_rate / 2):
            raise ValueError("Invalid frequency")

        if not (0.1 <= q <= 20):
            raise ValueError("Invalid Q")

        # Design a resonant peak filter
        b, a = iirpeak(
            frequency,
            q,
            fs=self.sample_rate,
        )

        # Convert to second-order sections
        from scipy.signal import tf2sos

        self.sos = tf2sos(b, a)

        # Preserve filter state when processing chunks
        self.zi = None

    def _configure_lowpass(self, frequency):
        from scipy.signal import butter

        if not (0 < frequency < self.sample_rate / 2):
            raise ValueError("Invalid frequency")

        self.sos = butter(
            2,
            frequency,
            btype="lowpass",
            fs=self.sample_rate,
            output="sos",
        )

        self.zi = None

    def _configure_highpass(self, frequency):
        from scipy.signal import butter

        if not (0 < frequency < self.sample_rate / 2):
            raise ValueError("Invalid frequency")

        self.sos = butter(
            2,
            frequency,
            btype="highpass",
            fs=self.sample_rate,
            output="sos",
        )

        self.zi = None

    def process(self, audio: np.ndarray) -> np.ndarray:
        if self.sos is None:
            return audio

        if self.zi is None:
            self.zi = np.zeros(
                (self.sos.shape[0], 2),
                dtype=np.float64,
            )

        output, self.zi = sosfilt(
            self.sos,
            audio,
            zi=self.zi,
        )

        return output.astype(np.float32)