import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError

logger = logging.getLogger('core')

def custom_exception_handler(exc, context):
    """
    Centralized DRF exception handler.
    - Converts Django's core ValidationError to DRF's ValidationError for clean HTTP 400 responses.
    - Handles standard DRF APIException / ValidationError normally.
    - Captures unexpected 500 server errors, logs the full exception and traceback
      server-side only, and returns a safe generic JSON response without leaking
      internal SQL, filesystem paths, credentials, or stack traces.
    """
    # Transform Django model/field ValidationError to DRF ValidationError
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            exc = DRFValidationError(detail=exc.message_dict)
        elif hasattr(exc, 'messages'):
            exc = DRFValidationError(detail=exc.messages)
        else:
            exc = DRFValidationError(detail=str(exc))

    response = exception_handler(exc, context)

    if response is None:
        view = context.get('view')
        view_name = view.__class__.__name__ if view else 'UnknownView'
        request = context.get('request')
        method = request.method if request else 'UnknownMethod'
        path = request.path if request else 'UnknownPath'

        # Log detailed exception server-side only
        logger.exception(
            "Unhandled exception in %s [%s %s]",
            view_name,
            method,
            path,
            exc_info=exc
        )

        return Response(
            {"error": "An internal server error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
