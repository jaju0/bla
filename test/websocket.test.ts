import { RawData, WebSocket } from "ws";

const client = new WebSocket("ws://localhost:4815/realtime");
const username = "YourUsername";
const apiKey = "YourApiKey";

client.on("open", () => {
    let authMessage = {
        topic: "auth",
        payload: {
            username: "AnneWand",
            api_key: apiKey,
        }
    };

    client.send(JSON.stringify(authMessage));
});

client.on("message", (data: RawData, isBinary: boolean) => {
    const messageStr = data.toString();
    const message = JSON.parse(messageStr);

    if(message.topic == "auth" && message.payload.success)
    {
        let subscribeMessage = {
            topic: "subscribe",
            payload: {
                topics: ["chatrooms", "chatrooms.YourUsername", "users.f188515e-97f3-49df-ad09-ba8f781540cf", "message.YourUsername", "message.f188515e-97f3-49df-ad09-ba8f781540cf"],
            },
        };

        client.send(JSON.stringify(subscribeMessage));
    }
    else
        console.log(message);
});
