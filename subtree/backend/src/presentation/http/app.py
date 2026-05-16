from __future__ import annotations

import logging
from collections.abc import Callable
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from composition import AppContext, build_app_context
from presentation.http.routes import build_router


def create_app(
    app_context: AppContext | None = None,
    app_context_factory: Callable[[], AppContext] = build_app_context,
) -> FastAPI:
    load_dotenv(override=False)
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)-8s %(name)s  %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        context = app_context or app_context_factory()
        app.state.app_context = context
        try:
            yield
        finally:
            context.close()

    app = FastAPI(title="Pet Log Backend", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://pet-log-kp-20260504.azurewebsites.net",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(build_router())
    return app
