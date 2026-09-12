import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    
    response.status(status);
    if (typeof errorResponse === 'string') {
        response.locals.errorMessage = errorResponse;
        response.json( { statusCode: status, message: errorResponse } );
    } else {
        console.error(errorResponse);
        response.json( { statusCode: status, error: errorResponse } );
    }
  }
}
