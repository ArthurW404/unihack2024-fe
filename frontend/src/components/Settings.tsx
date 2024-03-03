import TextToVoice from "../components/TextToVoice";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  dangerouslyAllowBrowser: true,
  apiKey: import.meta.env.VITE_NEXT_PUBLIC_OPENAI_API_KEY, // This is the default and can be omitted
});

// Define the props type for Settings
interface SettingsProps {
  setChatLog: React.Dispatch<
    React.SetStateAction<{ type: string; message: string }[]>
  >;
  selectedOption: string;
  setSelectedOption: (value: string) => void;
  setCountdownStart: React.Dispatch<React.SetStateAction<boolean>>;
  setCallInterviewer: React.Dispatch<React.SetStateAction<string>>;
  setResponse: React.Dispatch<React.SetStateAction<string>>;
  isRecording: boolean;
  isButtonDisabled: boolean;
  hasInterviewStart: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  setIsButtonDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  setHasInterviewStart: React.Dispatch<React.SetStateAction<boolean>>;
}

const Settings: React.FC<SettingsProps> = ({
  setChatLog,
  selectedOption,
  setSelectedOption,
  setCountdownStart,
  setCallInterviewer,
  setResponse,
  isRecording,
  isButtonDisabled,
  hasInterviewStart,
  setIsRecording,
  setIsButtonDisabled,
  setHasInterviewStart,
}) => {
    console.log(hasInterviewStart, isRecording)
  const [responseText, setResponseText] = useState("");
  const [userAnswer, setUserAnswer] = useState("");

  const [questionArr, setQuestionArr] = useState<string[]>([]);
  const [answerArr, setAnswerArr] = useState<string[]>([]);

  //   Voice to text code
  // const [isRecording, setIsRecording] = useState(false);
  const [isBtnRecordDisabled, setIsBtnRecordDisabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [blobArr, setBlobArr] = useState<Blob[]>([]);
  // const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const [speaking, setSpeaking] = useState("hidden");

  //   const handleFinishInterview = async () => {
  //     // Post our answer to the last question
  //     const url = `{import.meta.env.VITE_NEXT_PUBLIC_BACKEND_ROUTE}/rating`;
  //     const qa_chain = questionArr.reduce((prev, curr, idx) => {
  //         return [...prev, curr, answerArr[idx]];
  //     }, [])

  //     const options = {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         "conversation": qa_chain
  //       }),
  //     };

  //     // Get response and next question, should be based on previous q&a
  //     const resultPromise = await fetch(url, options);
  //     const rating = await resultPromise.text();
  //     setResponseText(rating)
  //   };

  const stopRecording = async () => {
    // Disable the button
    setSpeaking("hidden");
    setIsBtnRecordDisabled(true);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    console.log("Recording stopped");

    // console.log(audioBuf)
    // const myReadableStream = bufferToStream(audioBuf);
    if (blobArr.length !== 0) {
      const file = new File(blobArr, "audio.mp3", { type: "audio/mp3" });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
      });
      console.log("In stop recording");

      console.log(transcription);
      console.log(transcription.text);
      setUserAnswer(transcription.text);
      setBlobArr([]);

      setChatLog((prevChatLog) => [
        ...prevChatLog,
        {
          type: "user",
          message: transcription.text,
        },
      ]);
    } else {
      setUserAnswer("...");
    }
  };

  const startRecording = async () => {
    console.log("Recording started");
    setSpeaking("hidden");
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new (window as any).AudioContext();
      const micSource = audioContext.createMediaStreamSource(audioStream);

      const destination = audioContext.createMediaStreamDestination();
      micSource.connect(destination);

      setIsRecording(true);
      setStream(destination.stream);

      const mimeTypes = ["audio/mp4", "audio/webm"].filter((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (mimeTypes.length === 0) {
        return alert("Browser not supported");
      }

      const recorder = new MediaRecorder(destination.stream, {
        mimeType: mimeTypes[0],
      });

      recorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          setBlobArr((prev) => [...prev, event.data]);
        }
      });

      recorder.start(1000);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
    setIsBtnRecordDisabled(false);
  };

  const getNextQuestion = async (prevQuest: string, prevAns: string) => {
    // add new  q&as  with history of q&as
    const newAnswers = [...answerArr, prevAns];
    const newQuestions = [...questionArr, prevQuest];

    // Post our answer to the last question
    const url = `${import.meta.env.VITE_NEXT_PUBLIC_BACKEND_ROUTE}/question`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company: selectedOption || "general", //google is our default
        "prev-question": newQuestions,
        "prev-answer": newAnswers,
      }),
    };

    // Get response and next question, should be based on previous q&a
    const resultPromise = await fetch(url, options);
    const question = await resultPromise.text();

    // Save history
    setAnswerArr(newAnswers);
    setQuestionArr(newQuestions);
    return question;
  };

  useEffect(() => {
    if (userAnswer !== "") {
      // Essentially answer loop, we got the answer to the question we asked
      console.log("userAnswer:", userAnswer);
      console.log("==> getting question useeffect");
      getNextQuestion(responseText, userAnswer).then((question) => {
        setResponseText(question);
        setSpeaking("block");
        console.log("getNext question")
        setChatLog((prevChatLog) => [
          ...prevChatLog,
          { type: "bot", message: question },
        ]);
      });
    }
  }, [userAnswer]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
    console.log(event.target.value);
  };

  const handleEndText = () => {
    console.log("===> startRecording");

    startRecording();
  };

  const handleStartInterview = () => {
    console.log("Interview Started");
    setHasInterviewStart(true);
    setCountdownStart(true);
    setCallInterviewer("block flex flex-col opacity-40");

    const url = `${import.meta.env.VITE_NEXT_PUBLIC_BACKEND_ROUTE}/greeting`;

    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    fetch(url, options)
      .then((response) => {
        return response.text();
      })
      .then((data) => {
        console.log("===> data:", data);
        setResponseText(data);
        setResponse(data);
        setChatLog((prevChatLog) => [
          ...prevChatLog,
          {
            type: "bot",
            message: data,
          },
        ]);
        setSpeaking("block");
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });

    // Disable the button
    setIsButtonDisabled(true);
  };

  // const handleStop = () => {
  //   setCountdownStart(false); // Stop countdown
  //   setCountdownKey(0);
  // };

  const Speaker = () => {
    return (
      <div className="absolute lg:top-[50vh] md:top-[30vh] right-[34%]">
        <span className={`relative flex ${speaking} h-3 w-3`}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
        </span>
      </div>
    );
  };

  const navigate = useNavigate();

  const goToFeedbackPage = () => {
    navigate("/feedback");
  };

  return (
    <div className="bg-[#1a1a1a] p-8 ml-10">
      <div className="mt-4">
        <select
          className="select select-bordered select-lg w-full bg-[#2e2e2e]"
          onChange={handleChange}
          defaultValue="" // To address the controlled component aspect
        >
          <option disabled value="">
            Select company...
          </option>
          <option value="amazon">amazon</option>
          <option value="airbnb">airbnb</option>
          <option value="dropbox">dropbox</option>
          <option value="lyft">lyft</option>
          <option value="palantir">palantir</option>
          <option value="slack">slack</option>
          <option value="stack_overflow">stack_overflow</option>
          <option value="stripe">stripe</option>
          <option value="tiktok">tiktok</option>
        </select>

        {/* <div className="flex flex-col rounded-md border border-white p-4 mt-4 justify-center items-center">
          <div className="w-full">
            <input
              className="p-4 w-full bg-white text-black rounded-md"
              placeholder="Include your own questions..."
            />
          </div>
          <button className="btn bg-[#2e2e2e] rounded-full mt-6 mb-2 text-white border border-blue-600 hover:bg-[#363636] hover:border hover:border-blue-600">
            Add question
          </button>
        </div> */}
      </div>
      <div className="mt-8 flex justify-end flex-col">
        <div className="flex-row self-end space-x-4">
          <button
            onClick={handleStartInterview}
            className="btn text-white bg-[#2e2e2e] hover:bg-[#363636] disabled:bg-[#575757] disabled:text-gray-400"
            disabled={isButtonDisabled}
          >
            Start interview
          </button>
          <button
            className="btn text-white bg-[#2e2e2e] hover:bg-[#363636] disabled:bg-[#575757] disabled:text-gray-400"
            onClick={stopRecording}
            disabled={isBtnRecordDisabled}
          >
            Stop Recording
          </button>
          <button
            className="btn text-white bg-green-500 hover:bg-[#363636] disabled:bg-[#575757] disabled:text-gray-400"
            disabled={isBtnRecordDisabled}
            onClick={goToFeedbackPage}
          >
            Finish interview
          </button>
        </div>
      </div>
      {responseText && (
        <>
          <TextToVoice text={responseText} handleEnd={handleEndText} />
          <Speaker />
        </>
      )}
    </div>
  );
};

export default Settings;
