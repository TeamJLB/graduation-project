import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import Peer from "peerjs";
import Controllers from "./Controllers";
import styles from "./StreamBox.module.css";
import Modal from "../UI/Modal";

const StreamBox = (props) => {
  const location = useLocation();
  const userToken = location.state.config.headers["x-access-token"];
  const roomName = location.state.meeting_id;
  
  const [myStream, setMyStream] = useState(null);
  const [streamId, setStreamId] = useState("");
  const [peerId, setPeerId] = useState("");
  
  const [mute, setMute] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  
  const videoGrid = useRef();
  const myVideo = useRef();
  
  let peer;
  // const peer = new Peer();
  const peers = {};
  
  const confirm = (userid) => {
    console.log(roomName, userid, "✅ 연결됨");
  };
  
  useEffect(() => {
    // [로컬 서버에서 테스트용]
    //const socket = io.connect("http://localhost:3000/");
    // [실제 서버에서 원격용]
    const socket = io.connect("http://3.39.169.146:3000/");
    peer = new Peer();

    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then((currentStream) => {
        setStreamId(currentStream.id);
        setMyStream(currentStream);
        addVideoStream(myVideo.current, currentStream);
        videoGrid.current.append(myVideo.current);

        peer.on("call", (call) => {
          call.answer(currentStream);
          const video = document.createElement("video");

          call.on("stream", (userVideoStream) => {
            addVideoStream(video, userVideoStream);
            videoGrid.current.append(video);
          });
        });

        socket.on("user-connected", (userId) => {
          console.log("User connected : ", userId);
          connectNewUser(userId, currentStream);
        });
      });

    socket.on("user-disconnected", (userId) => {
      console.log("User disconnectd : ", userId);
      if (peers[userId]) peers[userId].close();
    });

    peer.on("open", (id) => {
      socket.emit("join-room", roomName, id, confirm);
    });
  }, [roomName]);

  const connectNewUser = (userId, stream) => {
    const call = peer.call(userId, stream);
    const video = document.createElement("video");

    call.on("stream", (videoStream) => {
      addVideoStream(video, videoStream);
      videoGrid.current.append(video);
    });

    call.on("close", () => {
      video.remove();
    });

    peers[userId] = call;
  };

  const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => video.play());
    // videoGrid.current.append(video);
  };

  const handleMuteClick = () => {
    myStream
      .getAudioTracks()
      .forEach((track) => (track.enabled = !track.enabled));
    setMute((prev) => !prev);
  };

  const handleCameraClick = () => {
    myStream
      .getVideoTracks()
      .forEach((track) => (track.enabled = !track.enabled));
    setCameraOn((prev) => !prev);
  };

  return (
    <>
      <div className={styles.streamBox}>
        <div className={styles.streams}>
          <div ref={videoGrid}>
            <video ref={myVideo} muted autoPlay className={styles.myFace} />
            <h3 className={styles.userNickname} />
          </div>
        </div>
        <Controllers
          mute={mute}
          cameraOn={cameraOn}
          onMuteClick={handleMuteClick}
          onCameraClick={handleCameraClick}
        />
      </div>
    </>
  );
};

export default StreamBox;
