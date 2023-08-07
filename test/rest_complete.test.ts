import axios from "axios";
import setCookie from "set-cookie-parser";

interface RestCompleteTestParams
{
    url: string;
    username: string;
    user_password: string;
    user_description: string;
}

class RestCompleteTest
{
    private params: RestCompleteTestParams;
    private sessionId?: string;
    private chatroomId?: string;
    private messageId?: string;

    constructor(params: RestCompleteTestParams)
    {
        this.params = params;
    }

    public async createUser()
    {
        const userCreationData = {
            username: this.params.username,
            password: this.params.user_password,
            description: this.params.user_description,
        };

        const headers = {
            "content-type": "application/json"
        };

        const response = await axios.post(this.params.url + "/user", userCreationData, {headers});
        if(response.status != 200)
            throw new Error(`user creation failed with response code: ${response.status}`);

        const setCookieHeader = response.headers["set-cookie"];
        if(!setCookieHeader)
            throw new Error("set-cookie header was not received in user creation response");

        const cookies = setCookie.parse(setCookieHeader, {
            decodeValues: false,
            map: true,
        });

        if(!cookies.sid)
            throw new Error("session id cookie not found in user creation response");

        this.sessionId = cookies.sid.value;
        console.log("[OK] POST /user");
    }

    public async changeUser()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        const userAmendmentData = {
            old_password: this.params.user_password,
            password: this.params.user_password+"amended",
            description: "Amended description",
        };

        const headers = {
            "content-type": "application/json",
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.put(this.params.url + "/user", userAmendmentData, {headers});
        if(response.status != 200)
            throw new Error(`user amendment failed with response code: ${response.status}`);

        console.log("[OK] PUT /user");
    }

    public async deleteUser()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.delete(this.params.url + `/user/${this.params.username}`, {headers});
        if(response.status != 200)
            throw new Error(`user deletion failed with response code: ${response.status}`);

        console.log("[OK] DELETE /user/:username");
    }

    public async getUsers()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + "/user", {headers});
        if(response.status != 200)
            throw new Error(`user list request failed with response code: ${response.status}`);

        console.log("[OK] GET /user");
    }

    public async getUserByName()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + `/user/${this.params.username}`, {headers});
        if(response.status != 200)
            throw new Error(`user by name request failed with response code: ${response.status}`);

        console.log("[OK] GET /user/:username");
    }

    public async postMessage()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.chatroomId)
            throw new Error("a test chatroom must be created before posting a test message");

        const messageCreationData = {
            chatroom_id: this.chatroomId,
            content: "Test Message!",
        };

        const headers = {
            "content-type": "application/json",
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.post(this.params.url + "/message", messageCreationData, {headers});
        if(response.status != 200)
            throw new Error(`message creation failed with response code: ${response.status}`);

        if(!response.data.id)
            throw new Error("could not receive message id");

        this.messageId = response.data.id;

        console.log("[OK] POST /message");
    }

    public async deleteMessage()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.messageId)
            throw new Error("a test message must be created before it can be deleted");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.delete(this.params.url + `/message/${this.messageId}`, {headers});
        if(response.status != 200)
            throw new Error(`message deletion failed with response code: ${response.status}`);

        this.messageId = undefined;

        console.log("[OK] DELETE /message/:id");
    }

    public async getMessageById()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.messageId)
            throw new Error("a test message must be created before it can be requested");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + `/message/${this.messageId}`, {headers});
        if(response.status != 200)
            throw new Error(`message by id request failed with response code: ${response.status}`);

        console.log("[OK] GET /message/:id");
    }

    public async getMessagesByUsername()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.messageId)
            throw new Error("a test message must be created before it can be requested");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + `/message/user/${this.params.username}`, {headers});
        if(response.status != 200)
            throw new Error(`message by username request failed with response code: ${response.status}`);

        console.log("[OK] GET /message/user/:username");
    }

    public async getMesssagesByChatroomId()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.chatroomId)
            throw new Error("a chatroom must be created before messages can be requested");

        if(!this.messageId)
            throw new Error("a test message must be created before it can be requested");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + `/message/chatroom/${this.chatroomId}`, {headers});
        if(response.status != 200)
            throw new Error(`message by chatroom id request failed with response code: ${response.status}`);

        console.log("[OK] GET /message/chatroom/:chatroom_id");
    }

    public async postChatroom()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        const chatroomCreationData = {
            topic: "Test Chatroom",
        };

        const headers = {
            "content-type": "application/json",
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.post(this.params.url + "/chatroom", chatroomCreationData, {headers});
        if(response.status != 200)
            throw new Error(`chatroom creation failed with response code: ${response.status}`);

        if(!response.data.id)
            throw new Error("could not receive chatroom id");

        this.chatroomId = response.data.id;

        console.log("[OK] POST /chatroom");
    }

    public async deleteChatroom()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.chatroomId)
            throw new Error("a chatroom must be created before it can be deleted");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.delete(this.params.url + `/chatroom/${this.chatroomId}`, {headers});
        if(response.status != 200)
            throw new Error(`chatroom deletion failed with response code: ${response.status}`);

        this.chatroomId = undefined;

        console.log("[OK] DELETE /chatroom/:id");
    }

    public async getChatrooms()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.chatroomId)
            throw new Error("a chatroom must be created before it can be requested");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + `/chatroom`, {headers});
        if(response.status != 200)
            throw new Error(`chatroom list request failed with response code: ${response.status}`);

        console.log("[OK] GET /chatroom");
    }

    public async getChatroomsByUsername()
    {
        if(!this.sessionId)
            throw new Error("sessionId has to be set for protected endpoints");

        if(!this.chatroomId)
            throw new Error("a chatroom must be created before it can be requested");

        const headers = {
            "cookie": `sid=${this.sessionId}`,
        };

        const response = await axios.get(this.params.url + `/chatroom/${this.params.username}`, {headers});
        if(response.status != 200)
            throw new Error(`chatroom list by username request failed with response code: ${response.status}`);

        console.log("[OK] GET /chatroom/:username");
    }

}

(async () =>{

    const test = new RestCompleteTest({
        url: "http://localhost:4815",
        username: "TestUser",
        user_password: "TestPassword123",
        user_description: "Hello, this is me!",
    });

    await test.createUser();
    await test.changeUser();
    await test.getUsers();
    await test.getUserByName();
    await test.postChatroom();
    await test.getChatrooms();
    await test.getChatroomsByUsername();
    await test.postMessage();
    await test.getMessageById();
    await test.getMessagesByUsername();
    await test.getMesssagesByChatroomId();
    await test.deleteMessage();
    await test.deleteChatroom();
    await test.deleteUser();

})();