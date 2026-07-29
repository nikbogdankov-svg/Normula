/**
 * Контракт бэкенда: onemoreadmin.v1.OnemoreAdminService/Hello
 * (api/onemoreadmin/v1/onemoreadmin.proto), HTTP-биндинг `GET /hello`.
 *
 * Имена полей — как в JSON grpc-gateway (lowerCamelCase у proto-полей).
 */

/** Query-параметры GET /hello. */
export interface HelloRequest {
  name: string;
}

/** Тело ответа GET /hello. */
export interface HelloResponse {
  greeting: string;
}
