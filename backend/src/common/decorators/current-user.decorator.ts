import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class JwtPayload {
  sub: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
