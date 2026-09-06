"""
ChainTrace Background Worker Service
Processes asynchronous investigation tasks: blockchain traversal, graph indexing, risk calculation.
"""
import asyncio
import signal

from apps.api.src.core.config import settings

running = True


def handle_shutdown(sig, frame):
    global running
    print(f"\n[Worker] Received shutdown signal {sig}. Exiting gracefully...")
    running = False


async def process_jobs():
    print("[Worker] ChainTrace Job Worker initialized.")
    print(f"[Worker] Queue Backend: {settings.REDIS_URL} (Fallback: {settings.REDIS_MOCK_FALLBACK})")
    print("[Worker] Listening for trace and intelligence jobs...")

    while running:
        # Heartbeat loop ready for task consumption
        await asyncio.sleep(2)


def main():
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    try:
        asyncio.run(process_jobs())
    except KeyboardInterrupt:
        pass
    print("[Worker] Worker shutdown complete.")


if __name__ == "__main__":
    main()
