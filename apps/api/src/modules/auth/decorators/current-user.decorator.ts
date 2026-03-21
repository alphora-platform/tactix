import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../database/entities';

/** Injects the authenticated user (or a specific field) from the JWT payload. */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as User;
    return field ? user?.[field] : user;
  }
);
