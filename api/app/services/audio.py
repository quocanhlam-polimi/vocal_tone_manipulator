import asyncio
import numpy as np
from scipy.signal import iirpeak, sosfilt
from pedalboard import PitchShift
from app.services.matlab_service import MatlabService

class AudioFilter:
    def __init__(self, sample_rate: int, matlab_service: MatlabService):
        self.sample_rate = sample_rate
        self.sos = None
        self.zi = None
        self.frequency = 0.0
        self.filter_type = None
        self.pitch_shifter = PitchShift(semitones=0.0)
        self.matlab_service = matlab_service

    def configure(self, config: dict):
        filter_type = config.get("filterType")
        self.filter_type = filter_type

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

        elif filter_type == "lowpass_matlab":
            self._configure_lowpass_matlab(
                frequency=float(config["frequency"]),
            )

        elif filter_type == "pitchshift":
            self._configure_pitchshift(
                semitones=float(config["semitones"]),
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

        # reset pitch shift
        self.pitch_shifter = PitchShift(semitones=0.0)

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

        # reset pitch shift
        self.pitch_shifter = PitchShift(semitones=0.0)

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

        # reset pitch shift
        self.pitch_shifter = PitchShift(semitones=0.0)

    def _configure_lowpass_matlab(self, frequency: float):
        self.frequency = frequency
        self.zi = None
    
    def _configure_pitchshift(self, semitones: float):
        if not -12 <= semitones <= 12:
            raise ValueError("Pitch shift must be between -12 and +12")

        # Update the existing plugin rather than creating a new one.
        self.pitch_shifter.semitones = semitones

        # reset filter
        self.sos = None
        self.zi = None

    async def process(self, audio: np.ndarray) -> np.ndarray:
        # pitch shift
        # Ensure float32 input
        # audio = np.asarray(audio, dtype=np.float32)

        # # Pedalboard expects shape: (channels, samples)
        # audio_2d = audio.reshape(1, -1)

        # # 1. Apply pitch shift
        # audio_2d = self.pitch_shifter.process(
        #     audio_2d,
        #     self.sample_rate,
        #     reset=False,
        # )

        # audio = audio_2d[0]

        if self.filter_type == 'lowpass_matlab':
            return await self._process_lowpass_matlab(audio)

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
    
    async def _process_lowpass_matlab(self, audio):
        output, self.zi = await asyncio.to_thread(
            self.matlab_service.process_audio,
            audio,
            self.zi,
            self.frequency,
            self.sample_rate,
        )
        return output