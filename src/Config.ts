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

export default interface Config
{
    port: number;
    ssl: SSLConfig;
    database: DatabaseConfig;
    websocket: WebsocketConfig;
    rate_limiters: any;
}