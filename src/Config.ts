export interface SSLConfig
{
    enabled: boolean;
    key_file: string;
    cert_file: string;
    ca_file: string;
}

export interface DatabaseConfig
{
    host: string;
    user: string;
    password: string;
    name: string;
    charset: string;
}

export interface WebsocketConfig
{
    path: string;
}

export interface BcryptConfig
{
    salt_rounds: number;
}

export interface SessionConfig
{
    secret: string;
    cookie_max_age: number;
}

export default interface Config
{
    port: number;
    ssl: SSLConfig;
    database: DatabaseConfig;
    websocket: WebsocketConfig;
    bcrypt: BcryptConfig;
    session: SessionConfig;
    rate_limiters: any;
}