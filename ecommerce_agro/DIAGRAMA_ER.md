# Diagrama entidad-relación

```mermaid
erDiagram
    USERS ||--o{ ORDERS : realiza
    ORDERS ||--o{ ORDER_ITEMS : contiene
    PRODUCTS ||--o{ ORDER_ITEMS : incluye

    USERS {
        int id PK
        string nombre
        string email UK
        string password
        string profileImage
        datetime createdAt
        datetime updatedAt
    }

    PRODUCTS {
        int id PK
        string nombre
        text descripcion
        enum categoria
        decimal precio
        int stock
        string imagen
        datetime createdAt
        datetime updatedAt
    }

    ORDERS {
        int id PK
        int userId FK
        decimal total
        enum estado
        datetime createdAt
        datetime updatedAt
    }

    ORDER_ITEMS {
        int id PK
        int orderId FK
        int productId FK
        int cantidad
        decimal precioUnitario
        datetime createdAt
        datetime updatedAt
    }
```

## Relaciones

- Un usuario puede realizar muchos pedidos.
- Un pedido pertenece a un usuario.
- Un pedido contiene muchos detalles de pedido.
- Un producto puede aparecer en muchos detalles de pedido.
- `order_items` conecta los pedidos con los productos y guarda la cantidad y el precio unitario.