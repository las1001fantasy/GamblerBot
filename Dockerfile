# 1. Usamos una versión estable y ligera de Node.js
FROM node:18-slim

# 2. Creamos y definimos el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiamos los archivos de configuración de paquetes
COPY package*.json ./

# 4. Instalamos las dependencias necesarias de producción
RUN npm install --only=production

# 5. Copiamos el resto del código del bot al contenedor
COPY . .

# 6. Exponemos el puerto 8080 (el puerto estándar que exige Google Cloud Run)
EXPOSE 8080

# 7. Comando para arrancar la aplicación
CMD [ "node", "index.js" ]