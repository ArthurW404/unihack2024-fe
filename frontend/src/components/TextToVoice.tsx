import  { useState, useEffect, useRef } from "react";

interface TextToSpeechProps {
  text: string;
  handleEnd: () => void;
}

function TextToSpeech({ text, handleEnd }: TextToSpeechProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const lastText = useRef("");

  useEffect(() => {
    // Only fetch new audio if the text has changed
    if (text && text !== lastText.current) {
      lastText.current = text; // Update lastText with the new value
      const options = {
        method: "POST",
        headers: {
          accept: "audio/mpeg",
          "content-type": "application/json",
          AUTHORIZATION: "1254d852d88c43e680b5cc37656600cf",
          "X-USER-ID": "ULnz9mRIErNnVdpNHxIY91sGfm93",
        },
        body: JSON.stringify({
          text: text,
          voice:
            "s3://voice-cloning-zero-shot/dc23bb38-f568-4323-b6fb-7d64f685b97a/joseph/manifest.json",
          output_format: "mp3",
          sample_rate: 8000,
        }),
      };

      fetch("/api", options)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch audio");
          }
          return response.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        })
        .catch((err) => console.error(err));
    } else {
      console.log(text, lastText.current);
    }
  }, [text]);

  useEffect(() => {
    // Play the audio if audioUrl is set
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        handleEnd(); // Call the provided handleEnd when audio ends
        setAudioUrl(null); // Reset audioUrl to null after playing
      };
    }
  }, [audioUrl, handleEnd]);

  return <div></div>;
}

export default TextToSpeech;
