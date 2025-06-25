import * as Speech from 'expo-speech';
import { NavigationStep } from "@/components/Map/types";

export class VoiceGuidance {
  private static instance: VoiceGuidance;
  private isSpeaking = false;
  private voiceType: 'male' | 'female' = 'female';

  private constructor() {}

  public static getInstance(): VoiceGuidance {
    if (!VoiceGuidance.instance) {
      VoiceGuidance.instance = new VoiceGuidance();
    }
    return VoiceGuidance.instance;
  }

  public setVoiceType(type: 'male' | 'female') {
    this.voiceType = type;
  }

  public async speak(step: NavigationStep) {
    if (this.isSpeaking) {
      await this.stop();
    }

    const text = this.formatInstruction(step);
    const voice = this.voiceType === 'male' ? 
      'com.apple.ttsbundle.Daniel-compact' : 
      'com.apple.ttsbundle.Samantha-compact';

    this.isSpeaking = true;
    Speech.speak(text, {
      voice,
      rate: 0.9,
      onDone: () => {
        this.isSpeaking = false;
      },
      onError: () => {
        this.isSpeaking = false;
      },
    });
  }

  public async stop() {
    this.isSpeaking = false;
    Speech.stop();
  }

  public togglePause() {
    if (this.isSpeaking) {
      Speech.pause();
      this.isSpeaking = false;
    } else {
      Speech.resume();
      this.isSpeaking = true;
    }
  }

  private formatInstruction(step: NavigationStep): string {
    let instruction = step.instruction;
    
    // Simplify some common instructions
    instruction = instruction.replace(/Head (.*?) on/, 'Go $1 on');
    instruction = instruction.replace(/Turn (.*?) onto/, 'Turn $1 on');
    instruction = instruction.replace(/Destination will be/, 'Your destination is');
    
    // Add distance if available
    if (step.distance) {
      instruction += ` in ${step.distance}`;
    }
    
    return instruction;
  }
}