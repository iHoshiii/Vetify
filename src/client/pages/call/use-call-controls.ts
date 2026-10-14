import { useCallback, useState } from 'react';

export function useCallControls(stream: MediaStream | null) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const toggleMic = useCallback(() => {
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((track) => (track.enabled = next));
    setMicOn(next);
  }, [stream, micOn]);
  const toggleCam = useCallback(() => {
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((track) => (track.enabled = next));
    setCamOn(next);
  }, [stream, camOn]);
  return { micOn, camOn, toggleMic, toggleCam };
}
