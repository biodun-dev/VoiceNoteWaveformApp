import React, { useRef, useState } from 'react';
import { Image, StyleSheet, Platform,Animated } from 'react-native';
import {View, TouchableOpacity, ScrollView, Text } from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Rect, Circle } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';


export default function HomeScreen() {
  const [recordings, setRecordings] = useState([]);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);

  const timerRef = useRef(null);

  const RECORDING_OPTIONS = {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert('Microphone permission is required!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      setCurrentRecording(recording);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!currentRecording) return;

      clearInterval(timerRef.current);
      setTimer(0);

      await currentRecording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await currentRecording.createNewLoadedSoundAsync();
      setRecordings((prev) => [
        ...prev,
        { sound, amplitudes: [...Array(50).keys()].map(() => Math.random() * 40 + 20), playheadPosition: 0 },
      ]);
      setCurrentRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const deleteRecording = () => {
    clearInterval(timerRef.current);
    setTimer(0);
    setCurrentRecording(null);
    setIsRecording(false);
  };

  const togglePlayback = async (index) => {
    const recording = recordings[index];
    if (!recording) return;

    const { sound, isPlaying } = recording;

    if (isPlaying) {
      await sound.pauseAsync();
      updateRecordingState(index, { isPlaying: false });
    } else {
      const status = await sound.getStatusAsync();
      if (status.didJustFinish || status.positionMillis === status.durationMillis) {
        await sound.setPositionAsync(0);
      }

      await sound.playAsync();
      updateRecordingState(index, { isPlaying: true });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          const playheadPosition = (status.positionMillis / status.durationMillis) * 100;
          updateRecordingState(index, { playheadPosition });

          if (status.didJustFinish) {
            updateRecordingState(index, { isPlaying: false, playheadPosition: 0 });
          }
        }
      });
    }
  };

  const updateRecordingState = (index, updates) => {
    setRecordings((prev) =>
      prev.map((rec, i) => (i === index ? { ...rec, ...updates } : rec))
    );
  };

  const renderWaveform = (amplitudes, playheadPosition) => {
    const barWidth = 1.1; 
    const barSpacing = 4.3;
    const centerY = 50; 
    const waveformWidth = amplitudes.length * (barWidth + barSpacing); 
  
    return (
      <Svg height="100" width={waveformWidth}>
        {amplitudes.map((value, index) => (
          <Rect
            key={index}
            x={index * (barWidth + barSpacing)}
            y={centerY - value / 2}
            width={barWidth}
            height={value}
            rx={2}
            fill={index <= playheadPosition / 2 ? '#0ABAB5' : '#E0E0E0'}
          />
        ))}
        <Circle
          cx={playheadPosition * 2.9}
          cy="50"
          r="5.7"
          fill="#0ABAB5"
        />
      </Svg>
    );
  };
  

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        <View style={styles.recordingUI}>
          <Text style={styles.timer}>{formatTime(timer)}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={stopRecording}>
              <Ionicons name="stop-circle" size={50} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteRecording}>
              <Ionicons name="trash" size={50} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <TouchableOpacity onPress={startRecording} style={styles.startButton}>
            <Ionicons name="mic-circle" size={50} color="#0ABAB5" />
          </TouchableOpacity>
          <ScrollView style={styles.recordingsList}>
            {recordings.map((recording, index) => (
              <View key={index} style={styles.manna} >
                <TouchableOpacity onPress={() => togglePlayback(index)}>
                  <Ionicons
                    name={recording.isPlaying ? 'pause-circle' : 'play-circle'}
                    size={50}
                    color="#0ABAB5"
                  />
                </TouchableOpacity>
                <View>
                {renderWaveform(recording.amplitudes, recording.playheadPosition || 0)}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop:90,
    padding:20,
    paddingBottom:40


  },

  timer: {
    fontSize: 24,
    color: '#FFF',
    marginBottom: 16,
     backgroundColor:"blue",
     padding:10
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
  },
  startButton: {
    alignItems: 'center',
  },
  recordingsList: {
    marginBottom:140
  },
  manna:{
    flexDirection:"row",
    alignItems:"center",
    borderColor:"red",
    borderWidth:1,
    gap:5,
    marginBottom: 26,
    borderRadius: 8,
  }
  
});
