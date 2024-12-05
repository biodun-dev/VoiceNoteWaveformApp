import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Rect, Circle } from 'react-native-svg';

export function WaveformVisualizer() {
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [amplitudes, setAmplitudes] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);

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
      setRecording(recording);
      setIsRecording(true);

      animationInterval.current = setInterval(() => {
        setAmplitudes((prev) => [
          ...prev.slice(-50), 
          Math.random() * 80 + 20, 
        ]);
      }, 100);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      clearInterval(animationInterval.current);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);

      const { sound } = await recording.createNewLoadedSoundAsync();
      setSound(sound);

      setAmplitudes((prev) => [...prev]);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };


  const togglePlayback = async () => {
    if (!sound) return;
  
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {

      if (playheadPosition >= amplitudes.length) {
        await sound.stopAsync(); 
        await sound.playFromPositionAsync(0); 
        setPlayheadPosition(0); 
      }
  
      await sound.setVolumeAsync(1.0);
      await sound.playAsync();
      setIsPlaying(true);
  
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.positionMillis) {
          const progress =
            (status.positionMillis / status.durationMillis) * amplitudes.length;
          setPlayheadPosition(progress);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayheadPosition(amplitudes.length); 
        }
      });
    }
  };
  
  
  const renderWaveform = () => {
    const barWidth = 4; 
    const barSpacing = 2; 
    const centerY = 50;

    return amplitudes.map((value, index) => (
      <Rect
        key={index}
        x={index * (barWidth + barSpacing)}
        y={centerY - value / 2} 
        width={barWidth}
        height={value}
        rx={2} 
        fill={index <= playheadPosition ? '#0ABAB5' : '#E0E0E0'}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Note Waveform</Text>
      {isRecording ? (
        <TouchableOpacity style={styles.button} onPress={stopRecording}>
          <Text style={styles.buttonText}>Stop Recording</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={startRecording}>
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>
      )}
      {sound && (
        <TouchableOpacity style={styles.button} onPress={togglePlayback}>
          <Text style={styles.buttonText}>
            {isPlaying ? 'Pause' : playheadPosition >= amplitudes.length ? 'Replay' : 'Play'}
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.waveformContainer}>
        <Svg height="100" width="100%">
          {renderWaveform()}
          {/* Playhead */}
          <Circle
            cx={playheadPosition * 6} 
            cy="50"
            r="5"
            fill="#0ABAB5"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#0ABAB5',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  waveformContainer: {
    marginTop: 16,
    width: '100%',
    height: 100,
    backgroundColor: '#1F2A30',
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
