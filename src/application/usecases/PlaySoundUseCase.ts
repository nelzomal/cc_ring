import { IConfigProvider } from "@application/ports/IConfigProvider";
import { ISoundPlayer } from "@application/ports/ISoundPlayer";

/**
 * Use case: Play notification sound
 */
export class PlaySoundUseCase {
  constructor(
    private readonly soundPlayer: ISoundPlayer,
    private readonly configProvider: IConfigProvider
  ) {}

  async execute(): Promise<void> {
    // Get sound configuration from provider (already validated by domain)
    const soundConfig = this.configProvider.getSoundConfig();

    // Play the sound
    await this.soundPlayer.play(soundConfig);
  }
}
