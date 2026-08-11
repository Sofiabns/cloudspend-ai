from mangum import Mangum

from app.main import app

asgi_handler = Mangum(app, lifespan="off")


def handler(event, context):
    if event.get("source") == "aws.events":
        return {"statusCode": 200, "body": "Scheduled CloudSpend refresh acknowledged"}
    return asgi_handler(event, context)
