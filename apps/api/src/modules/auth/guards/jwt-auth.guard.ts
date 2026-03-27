import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(_context: ExecutionContext) {
    // TODO: re-enable JWT auth when auth feature is ready
    return true;
  }
}
