document.addEventListener("DOMContentLoaded", () => {

const productos = [
{
id: 1,
nombre:"Fertilizante Orgánico",
precio:25000,
categoria:"agricola",
imagen:"/img/fertilizante.jpg"
},
{
id: 2,
nombre:"Vacuna Bovinos",
precio:35000,
categoria:"veterinaria",
imagen:"/img/vacuna_b.png"
},
{
id: 3,
nombre:"Azadón",
precio:45000,
categoria:"ferreteria",
imagen:"/img/azadon.jpg"
},
{
id: 4,
nombre:"Semillas de Maíz",
precio:15000,
categoria:"agricola",
imagen:"/img/maiz.jpg"
}
];

const contenedor = document.getElementById("productos");

function mostrarProductos(lista){

contenedor.innerHTML = "";

lista.forEach(p=>{

contenedor.innerHTML += `
<div class="card">

<img src="${p.imagen}">

<h3>${p.nombre}</h3>

<p class="precio">$${p.precio}</p>

<a href="/productos/editar/${p.id}">
  <button>Editar</button>
</a>

<button class="btn">Agregar</button>

</div>
`;

});

}

if(contenedor){
mostrarProductos(productos);
}

setTimeout(() => {

const buscador = document.getElementById("buscar");

if(buscador){

buscador.addEventListener("input",()=>{

const texto = buscador.value.toLowerCase();

const filtrados = productos.filter(p =>
p.nombre.toLowerCase().includes(texto)
);

mostrarProductos(filtrados);

});

}

},500);

window.filtrar = function(cat){

if(cat === "todos"){
mostrarProductos(productos);
return;
}

const filtrados = productos.filter(p => p.categoria === cat);

mostrarProductos(filtrados);

}

});