export class Empresa {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly slug: string,
    public readonly activa: boolean = true,
    public readonly logo: string | null = null,
    public readonly colorPrimario: string | null = null,
    public readonly colorSecundario: string | null = null,
    public readonly paginasHabilitadas: string[] = [],
    public readonly createdAt: Date = new Date(),
    public readonly paginaInicio: string | null = null,
    public readonly colorNombreEmpresa: string | null = null
  ) {}

  static fromPrisma(data: {
    id: string;
    nombre: string;
    slug: string;
    activa: boolean;
    logo: string | null;
    colorPrimario: string | null;
    colorSecundario: string | null;
    paginasHabilitadas: string[];
    createdAt: Date;
    paginaInicio?: string | null;
    colorNombreEmpresa?: string | null;
  }): Empresa {
    return new Empresa(
      data.id,
      data.nombre,
      data.slug,
      data.activa,
      data.logo,
      data.colorPrimario,
      data.colorSecundario,
      data.paginasHabilitadas,
      data.createdAt,
      data.paginaInicio ?? null,
      data.colorNombreEmpresa ?? null
    );
  }

  toPrisma(): {
    id: string;
    nombre: string;
    slug: string;
    activa: boolean;
    logo: string | null;
    colorPrimario: string | null;
    colorSecundario: string | null;
    paginasHabilitadas: string[];
    createdAt: Date;
    paginaInicio: string | null;
    colorNombreEmpresa: string | null;
  } {
    return {
      id: this.id,
      nombre: this.nombre,
      slug: this.slug,
      activa: this.activa,
      logo: this.logo,
      colorPrimario: this.colorPrimario,
      colorSecundario: this.colorSecundario,
      paginasHabilitadas: this.paginasHabilitadas,
      createdAt: this.createdAt,
      paginaInicio: this.paginaInicio,
      colorNombreEmpresa: this.colorNombreEmpresa,
    };
  }
}
