import { useEffect, useState } from 'react';

// Opens the camera and microphone once, and stops every track when the call page unmounts.
export function useMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let opened: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((media) => {
        // Unmounted before the prompt resolved: release the hardware instead of leaking it.
        if (!active) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        opened = media;
        setStream(media);
      })
      .catch(() => {
        if (active) setError('We could not reach your camera or microphone.');
      });

    return () => {
      active = false;
      opened?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { stream, error };
}
