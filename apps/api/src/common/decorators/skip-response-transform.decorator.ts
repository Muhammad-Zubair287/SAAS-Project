import { SetMetadata } from '@nestjs/common';
import { METADATA_KEYS } from '../constants/app.constants';

export const SkipResponseTransform = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(METADATA_KEYS.SKIP_RESPONSE_TRANSFORM, true);
