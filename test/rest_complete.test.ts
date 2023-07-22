import http from "http";

const host = "localhost";
const port = 4815;

let userData: any = {
    username: randomAlphanumeric(8),
    password: `${randomAlphanumeric(16)}a1`,
    description: "unit test user",
}

let chatroomData: any;
let messageData: any;

function randomAlphanumeric(length: number)
{
    return Math.random().toString(length*2).slice(2);
}

function makeRequest(path: string, method: string, finished: (response: any) => void, requestBody?: string, apiKey?: string)
{
    let headers: any = {
        "content-type": "application/json",
    };

    if(apiKey)
        headers["x-api-key"] = apiKey;

    const request = http.request({
        host: host,
        port: port,
        path: path,
        method: method,
        headers: headers,
    }, (res) => {
        if(res.statusCode != 200)
        {
            console.error(`[ERROR]: ${path} ${method} status code: ${res.statusCode}`);
            res.resume();
            return;
        }
        else
            console.log(`[OK]: ${path} ${method}`);

        let data = "";

        res.on("data", (chunk) => {
            data += chunk;
        });

        res.on("close", () => {
            const response = data.length ? JSON.parse(data) : data;
            finished(response);
        });
    });

    if(requestBody)
        request.write(requestBody);

    request.end();

    request.on("error", (error) => {
        console.error(error.message);
    });
}

function createUser(finished: (response: any) => void)
{
    makeRequest("/user", "POST", finished, JSON.stringify(userData));
}

function deleteUser(apiKey: string, username: string, finished: (response: any) => void)
{
    makeRequest(`/user/${username}`, "DELETE", finished, undefined, apiKey);
}

function changeUser(apiKey: string, username: string, finished: (response: any) => void, password?: string, description?: string)
{
    const putData = {
        username: username,
        password: password,
        description: description,
    };

    makeRequest("/user", "PUT", finished, JSON.stringify(putData), apiKey);
}

function getUserList(apiKey: string, username: string, finished: (response: any) => void)
{
    makeRequest(`/user?username=${username}`, "GET", finished, undefined, apiKey);
}

function getUser(apiKey: string, username: string, finished: (response: any) => void)
{
    makeRequest(`/user/${username}?username=${username}`, "GET", finished, undefined, apiKey);
}

function createChatroom(apiKey: string, username: string, finished: (response: any) => void, topic: string)
{
    const chatroomData = {
        username: username,
        topic: topic,
    };

    makeRequest("/chatroom", "POST", finished, JSON.stringify(chatroomData), apiKey);
}

function deleteChatroom(apiKey: string, username: string, finished: (response: any) => void, id: string)
{
    makeRequest(`/chatroom/${id}?username=${username}`, "DELETE", finished, undefined, apiKey);
}

function getChatroomList(apiKey: string, username: string, finished: (response: any) => void)
{
    makeRequest(`/chatroom?username=${username}`, "GET", finished, undefined, apiKey);
}

function getChatroomListByUsername(apiKey: string, username: string, finished: (response: any) => void)
{
    makeRequest(`/chatroom/${username}?username=${username}`, "GET", finished, undefined, apiKey);
}

function createMessage(apiKey: string, username: string, finished: (response: any) => void, chatroomId: string, content: string)
{
    const messageData = {
        username: username,
        chatroom_id: chatroomId,
        content: content,
    };

    makeRequest("/message", "POST", finished, JSON.stringify(messageData), apiKey);
}

function deleteMessage(apiKey: string, username: string, finished: (response: any) => void, id: string)
{
    makeRequest(`/message/${id}?username=${username}`, "DELETE", finished, undefined, apiKey);
}

function getMessageById(apiKey: string, username: string, finished: (response: any) => void, id: string)
{
    makeRequest(`/message/${id}?username=${username}`, "GET", finished, undefined, apiKey);
}

function getMessageListByUsername(apiKey: string, username: string, finished: (response: any) => void)
{
    makeRequest(`/message/user/${username}?username=${username}`, "GET", finished, undefined, apiKey);
}

function getMessageListByChatroomId(apiKey: string, username: string, finished: (response: any) => void, chatroomId: string)
{
    makeRequest(`/message/chatroom/${chatroomId}?username=${username}`, "GET", finished, undefined, apiKey);
}


function onDeleteUser(response: any)
{
    console.log("all requests successful!");
}

function onDeleteChatroom(response: any)
{
    deleteUser(userData.apiKey, userData.username, onDeleteUser);
}

function onDeleteMessage(response: any)
{
    deleteChatroom(userData.apiKey, userData.username, onDeleteChatroom, chatroomData.id);
}

function onGetMessageListByChatroomId(response: any)
{
    deleteMessage(userData.apiKey, userData.username, onDeleteMessage, messageData.id);
}

function onGetMessageListByUsername(response: any)
{
    getMessageListByChatroomId(userData.apiKey, userData.username, onGetMessageListByChatroomId, chatroomData.id);
}

function onGetMessageById(response: any)
{
    getMessageListByUsername(userData.apiKey, userData.username, onGetMessageListByUsername);
}

function onCreateMessage(response: any)
{
    messageData = response;
    getMessageById(userData.apiKey, userData.username, onGetMessageById, response.id);
}

function onGetChatroomListByUsername(response: any)
{
    createMessage(userData.apiKey, userData.username, onCreateMessage, chatroomData.id, `test message of user test user ${userData.username}`);
}

function onGetChatroomList(response: any)
{
    getChatroomListByUsername(userData.apiKey, userData.username, onGetChatroomListByUsername);
}

function onCreateChatroom(response: any)
{
    chatroomData = response;
    getChatroomList(userData.apiKey, userData.username, onGetChatroomList);
}

function onGetUserList(response: any)
{
    createChatroom(userData.apiKey, userData.username, onCreateChatroom, `test topic of user ${userData.username}`);
}

function onGetUser(response: any)
{
    getUserList(userData.apiKey, userData.username, onGetUserList);
}

function onChangeUser(response: any)
{
    userData.apiKey = response.api_key;
    getUser(userData.apiKey, userData.username, onGetUser);
}

function onCreateUser(response: any)
{
    const newPassword = `${randomAlphanumeric(16)}a1`;
    userData.password = newPassword;
    userData.description = "amended test user description";
    changeUser(response.api_key, response.username, onChangeUser, newPassword, userData.description);
}

createUser(onCreateUser);