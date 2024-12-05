import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

export function WaveformVisualizer() {
  const [recordings, setRecordings] = useState([]);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const animationInterval = useRef(null);

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

      animationInterval.current = setInterval(() => {
        // Simulate waveform animation (real amplitude capture can be added here)
      }, 100);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!currentRecording) return;

      clearInterval(animationInterval.current);
      await currentRecording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await currentRecording.createNewLoadedSoundAsync();
      setRecordings((prev) => [
        ...prev,
        { sound, amplitudes: [...Array(50).keys()].map(() => Math.random() * 40 + 20) },
      ]);
      setCurrentRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const togglePlayback = async (index) => {
    const recording = recordings[index];
    if (!recording) return;

    const { sound, isPlaying } = recording;

    if (isPlaying) {
      await sound.pauseAsync();
      updateRecordingState(index, { isPlaying: false });
    } else {
      await sound.replayAsync();
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
    const barWidth = 4;
    const barSpacing = 2;
    const centerY = 50;

    return (
      <Svg height="100" width="100%">
        {amplitudes.map((value, index) => (
          <Rect
            key={index}
            x={index * (barWidth + barSpacing)}
            y={centerY - value / 2}
            width={barWidth}
            height={value}
            rx={2}
            fill={index <= playheadPosition ? '#0ABAB5' : '#E0E0E0'}
          />
        ))}
        <Line
          x1={playheadPosition * (barWidth + barSpacing)}
          y1="0"
          x2={playheadPosition * (barWidth + barSpacing)}
          y2="100"
          stroke="white"
          strokeWidth="2"
        />
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        {isRecording ? (
          <TouchableOpacity onPress={stopRecording}>
            <Ionicons name="stop-circle" size={50} color="#FF3B30" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startRecording}>
            <Ionicons name="mic-circle" size={50} color="#0ABAB5" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.recordingsList}>
        {recordings.map((recording, index) => (
          <View key={index} style={styles.recordingItem}>
            <TouchableOpacity onPress={() => togglePlayback(index)}>
              <Ionicons
                name={recording.isPlaying ? 'pause-circle' : 'play-circle'}
                size={40}
                color="#0ABAB5"
              />
            </TouchableOpacity>
            {renderWaveform(recording.amplitudes, recording.playheadPosition || 0)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  recordingsList: {
    marginTop: 16,
  },
  recordingItem: {
    marginBottom: 16,
    backgroundColor: '#1F2A30',
    borderRadius: 8,
    padding: 10,
  },
});
