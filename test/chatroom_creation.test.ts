import http from "http";

const apiKey = "YourApiKey";

const chatroomData = {
    username: "YourUsername",
    topic: "Test Topic",
};

const request = http.request({
    host: "localhost",
    port: 4815,
    path: "/chatroom",
    method: "POST",
    headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
    },
}, (res) => {
    if(res.statusCode != 200)
    {
        console.error("response got an error status code: " + res.statusCode);
        res.resume();
        return;
    }

    let data = "";

    res.on("data", (chunk) => {
        data += chunk;
    });

    res.on("close", () => {
        console.log(JSON.parse(data));
    });
});

request.write(JSON.stringify(chatroomData));
request.end();

request.on("error", (error) => {
    console.error(error.message);
});