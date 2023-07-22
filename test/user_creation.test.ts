import http from "http";

const userData = {
    username: "testuser",
    password: "MyPassword123",
    description: "Hello, this is me!",
};

const request = http.request({
    host: "localhost",
    port: 4815,
    path: "/user",
    method: "POST",
    headers: {
        "Content-Type": "application/json"
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

request.write(JSON.stringify(userData));
request.end();

request.on("error", (error) => {
    console.error(error.message);
});