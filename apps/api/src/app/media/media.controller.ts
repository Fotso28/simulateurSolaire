import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn } from 'class-validator';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/api-error';
import { MAX_UPLOAD_BYTES, processUpload } from './media-processing';
import { MediaStorage } from './media-storage';

class UploadMediaDto {
  @IsIn(['icon', 'image'])
  kind!: 'icon' | 'image';
}

@Controller('admin/media')
@Roles('ADMIN', 'EDITEUR')
export class MediaController {
  constructor(
    private readonly storage: MediaStorage,
    private readonly audit: AuditService,
  ) {}

  /** Multipart : champ `file` + champ `kind` (`icon` → SVG nettoyé, `image` → WebP 512 px). */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // + 1 : le dépassement atteint processUpload (413 FILE_TOO_LARGE).
      limits: { fileSize: MAX_UPLOAD_BYTES + 1, files: 1 },
    }),
  )
  async upload(
    @UploadedFile() file: { buffer: Buffer; size: number } | undefined,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Le fichier est obligatoire.',
        'file',
      );
    }
    const processed = await processUpload(dto.kind, file.buffer);
    const key = `${dto.kind}s/${randomUUID()}.${processed.extension}`;
    const url = await this.storage.put(
      key,
      processed.data,
      processed.contentType,
    );
    const media = {
      url,
      key,
      kind: dto.kind,
      contentType: processed.contentType,
      size: processed.data.length,
    };
    await this.audit.log({
      adminUserId: user.id,
      entity: 'media',
      entityId: key,
      action: 'upload',
      after: media,
    });
    return media;
  }
}
