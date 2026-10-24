import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { GLOBAL_PREFIX } from '../constants';
import { Env } from '../config/env';
import { LoginDto } from './auth.dto';
import { AuthService, SessionTokens } from './auth.service';
import { REFRESH_COOKIE } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly env: Env,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(await this.auth.login(dto.email, dto.password), res);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      return this.respond(
        await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]),
        res,
      );
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private respond(tokens: SessionTokens, res: Response) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(),
      expires: tokens.refreshExpiresAt,
    });
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: tokens.user,
    };
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'strict',
      path: `/${GLOBAL_PREFIX}/auth`,
    };
  }
}
