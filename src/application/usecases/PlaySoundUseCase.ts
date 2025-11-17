import { inject, injectable } from "inversify";
import "reflect-metadata";
import { TYPES } from "../../shared/types";
import { IConfigProvider } from "../ports/IConfigProvider";
import { ISoundPlayer } from "../ports/ISoundPlayer";

/**
 * Use case: Play notification sound
 */
@injectable()
export class PlaySoundUseCase {
  constructor(
    @inject(TYPES.ISoundPlayer) private readonly soundPlayer: ISoundPlayer,
    @inject(TYPES.IConfigProvider)
    private readonly configProvider: IConfigProvider
  ) {}

  async execute(): Promise<void> {
    // Get sound configuration from provider (already validated by domain)
    const soundConfig = this.configProvider.getSoundConfig();

    // Play the sound
    await this.soundPlayer.play(soundConfig);
  }
}
