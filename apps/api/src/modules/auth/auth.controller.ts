import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../../database/entities';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  signUp(@Body() dto: SignUpDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    return this.authService.signUp(dto, res);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: SignInDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    return this.authService.signIn(dto, res);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@Res({ passthrough: true }) res: Response): void {
    this.authService.signOut(res);
  }

  @Get('me')
  me(@CurrentUser() user: Omit<User, 'passwordHash'>): AuthResponseDto {
    return { id: user.id, email: user.email, username: user.username };
  }
}
