import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";

/**
 * Implementación S3-compatible del puerto de almacenamiento.
 * En desarrollo apunta al MinIO de docker-compose; en producción puede
 * apuntar a AWS S3 o Cloudflare R2 cambiando solo variables de entorno.
 */
export class AlmacenamientoMinIO implements IAlmacenamientoArchivos {
  private readonly cliente: S3Client;
  private readonly bucket: string;
  private bucketAsegurado = false;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "nutricionista";
    this.cliente = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    });
  }

  async subir(clave: string, contenido: Uint8Array, mimeType: string): Promise<void> {
    await this.asegurarBucket();
    await this.cliente.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: clave,
        Body: contenido,
        ContentType: mimeType,
      }),
    );
  }

  async generarUrlLectura(clave: string, expiraEnSegundos: number): Promise<string> {
    return getSignedUrl(
      this.cliente,
      new GetObjectCommand({ Bucket: this.bucket, Key: clave }),
      { expiresIn: expiraEnSegundos },
    );
  }

  async eliminar(clave: string): Promise<void> {
    await this.cliente.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }),
    );
  }

  async listarClaves(prefijo?: string): Promise<string[]> {
    await this.asegurarBucket();
    const claves: string[] = [];
    let token: string | undefined;

    do {
      const respuesta = await this.cliente.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefijo,
          ContinuationToken: token,
        }),
      );
      for (const objeto of respuesta.Contents ?? []) {
        if (objeto.Key) claves.push(objeto.Key);
      }
      token = respuesta.IsTruncated ? respuesta.NextContinuationToken : undefined;
    } while (token);

    return claves;
  }

  /** Crea el bucket la primera vez (idempotente; útil en desarrollo con MinIO). */
  private async asegurarBucket(): Promise<void> {
    if (this.bucketAsegurado) return;
    try {
      await this.cliente.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.cliente.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
    this.bucketAsegurado = true;
  }
}
