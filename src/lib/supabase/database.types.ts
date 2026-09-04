export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      administradores: {
        Row: {
          correo: string
          id: number
          nombre: string
          password_hash: string
          rol: string
        }
        Insert: {
          correo: string
          id?: number
          nombre: string
          password_hash: string
          rol: string
        }
        Update: {
          correo?: string
          id?: number
          nombre?: string
          password_hash?: string
          rol?: string
        }
        Relationships: []
      }
      // Parche manual -- tabla creada por
      // supabase/migrations/20260904090300_aforo_total_configurable.sql,
      // pendiente de aplicar vía CLI (bloqueado en esta máquina, ver
      // CLAUDE.md) y regenerar con `supabase gen types typescript --linked`.
      // Reemplazar este bloque cuando eso ocurra.
      aforo_total_boletos: {
        Row: {
          cupo_total_maximo: number
          fecha_modificacion: string
          id: number
          modificado_por: number | null
        }
        Insert: {
          cupo_total_maximo: number
          fecha_modificacion?: string
          id?: number
          modificado_por?: number | null
        }
        Update: {
          cupo_total_maximo?: number
          fecha_modificacion?: string
          id?: number
          modificado_por?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aforo_total_boletos_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "administradores"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          certificado_descargado: boolean
          correo: string | null
          estado: string
          fecha_activacion: string | null
          fecha_generado: string
          folio: string
          id: number
          intentos_fallidos: number
          lote_id: number | null
          nombre_completo: string | null
          orden_id: number | null
          password_hash: string
          tipo: string
        }
        Insert: {
          certificado_descargado?: boolean
          correo?: string | null
          estado?: string
          fecha_activacion?: string | null
          fecha_generado?: string
          folio: string
          id?: number
          intentos_fallidos?: number
          lote_id?: number | null
          nombre_completo?: string | null
          orden_id?: number | null
          password_hash: string
          tipo: string
        }
        Update: {
          certificado_descargado?: boolean
          correo?: string | null
          estado?: string
          fecha_activacion?: string | null
          fecha_generado?: string
          folio?: string
          id?: number
          intentos_fallidos?: number
          lote_id?: number | null
          nombre_completo?: string | null
          orden_id?: number | null
          password_hash?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_boletos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          boleto_id: number
          fecha_emision: string | null
          horas: number | null
          id: number
          tipo: string
        }
        Insert: {
          boleto_id: number
          fecha_emision?: string | null
          horas?: number | null
          id?: number
          tipo: string
        }
        Update: {
          boleto_id?: number
          fecha_emision?: string | null
          horas?: number | null
          id?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_boleto_id_fkey"
            columns: ["boleto_id"]
            isOneToOne: true
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_verificacion: {
        Row: {
          codigo_hash: string
          correo: string
          expira_en: string
          fecha_creacion: string
          id: number
          intentos_fallidos: number
          verificado: boolean
        }
        Insert: {
          codigo_hash: string
          correo: string
          expira_en: string
          fecha_creacion?: string
          id?: number
          intentos_fallidos?: number
          verificado?: boolean
        }
        Update: {
          codigo_hash?: string
          correo?: string
          expira_en?: string
          fecha_creacion?: string
          id?: number
          intentos_fallidos?: number
          verificado?: boolean
        }
        Relationships: []
      }
      comite_organizador: {
        Row: {
          bio: string | null
          cargo: string | null
          foto_url: string | null
          id: number
          nombre: string
        }
        Insert: {
          bio?: string | null
          cargo?: string | null
          foto_url?: string | null
          id?: number
          nombre: string
        }
        Update: {
          bio?: string | null
          cargo?: string | null
          foto_url?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      concursos: {
        Row: {
          archivo_bases_pdf: string | null
          categoria_tags: string[] | null
          descripcion: string | null
          fecha_limite: string | null
          icono_url: string | null
          id: number
          nombre: string
        }
        Insert: {
          archivo_bases_pdf?: string | null
          categoria_tags?: string[] | null
          descripcion?: string | null
          fecha_limite?: string | null
          icono_url?: string | null
          id?: number
          nombre: string
        }
        Update: {
          archivo_bases_pdf?: string | null
          categoria_tags?: string[] | null
          descripcion?: string | null
          fecha_limite?: string | null
          icono_url?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      cupos_boleto: {
        Row: {
          cupo_maximo: number
          fecha_modificacion: string
          id: number
          modificado_por: number | null
          tipo: string
        }
        Insert: {
          cupo_maximo: number
          fecha_modificacion?: string
          id?: number
          modificado_por?: number | null
          tipo: string
        }
        Update: {
          cupo_maximo?: number
          fecha_modificacion?: string
          id?: number
          modificado_por?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupos_boleto_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "administradores"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos_talleres: {
        Row: {
          archivo_url: string | null
          descripcion: string | null
          icono_url: string | null
          id: number
          nombre: string
        }
        Insert: {
          archivo_url?: string | null
          descripcion?: string | null
          icono_url?: string | null
          id?: number
          nombre: string
        }
        Update: {
          archivo_url?: string | null
          descripcion?: string | null
          icono_url?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      ediciones: {
        Row: {
          bienvenida_autor_foto_url: string | null
          bienvenida_autor_nombre: string | null
          bienvenida_mensaje: string | null
          es_actual: boolean
          estado: string | null
          fecha_creacion: string
          fecha_fin: string | null
          fecha_inicio: string | null
          homenajeado_bio: string | null
          homenajeado_foto_home_url: string | null
          homenajeado_foto_subpagina_url: string | null
          homenajeado_nombre: string | null
          id: number
          lema: string | null
          nombre: string | null
          numero: number | null
        }
        Insert: {
          bienvenida_autor_foto_url?: string | null
          bienvenida_autor_nombre?: string | null
          bienvenida_mensaje?: string | null
          es_actual?: boolean
          estado?: string | null
          fecha_creacion?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          homenajeado_bio?: string | null
          homenajeado_foto_home_url?: string | null
          homenajeado_foto_subpagina_url?: string | null
          homenajeado_nombre?: string | null
          id?: number
          lema?: string | null
          nombre?: string | null
          numero?: number | null
        }
        Update: {
          bienvenida_autor_foto_url?: string | null
          bienvenida_autor_nombre?: string | null
          bienvenida_mensaje?: string | null
          es_actual?: boolean
          estado?: string | null
          fecha_creacion?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          homenajeado_bio?: string | null
          homenajeado_foto_home_url?: string | null
          homenajeado_foto_subpagina_url?: string | null
          homenajeado_nombre?: string | null
          id?: number
          lema?: string | null
          nombre?: string | null
          numero?: number | null
        }
        Relationships: []
      }
      eventos_stripe_procesados: {
        Row: {
          fecha_procesado: string
          id: string
          tipo: string
        }
        Insert: {
          fecha_procesado?: string
          id: string
          tipo: string
        }
        Update: {
          fecha_procesado?: string
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      inscripciones_concurso: {
        Row: {
          capitan_correo: string
          capitan_nombre: string
          concurso_id: number
          fecha_inscripcion: string
          id: number
          nombre_equipo: string
        }
        Insert: {
          capitan_correo: string
          capitan_nombre: string
          concurso_id: number
          fecha_inscripcion?: string
          id?: number
          nombre_equipo: string
        }
        Update: {
          capitan_correo?: string
          capitan_nombre?: string
          concurso_id?: number
          fecha_inscripcion?: string
          id?: number
          nombre_equipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_concurso_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones_modulo: {
        Row: {
          boleto_id: number
          fecha_inscripcion: string
          id: number
          modulo_id: number
        }
        Insert: {
          boleto_id: number
          fecha_inscripcion?: string
          id?: number
          modulo_id: number
        }
        Update: {
          boleto_id?: number
          fecha_inscripcion?: string
          id?: number
          modulo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_modulo_boleto_id_fkey"
            columns: ["boleto_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_modulo_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_boletos: {
        Row: {
          archivo_descargado: boolean
          cantidad: number
          fecha_generacion: string
          generado_por: number
          id: number
          tipo: string
        }
        Insert: {
          archivo_descargado?: boolean
          cantidad: number
          fecha_generacion?: string
          generado_por: number
          id?: number
          tipo: string
        }
        Update: {
          archivo_descargado?: boolean
          cantidad?: number
          fecha_generacion?: string
          generado_por?: number
          id?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_boletos_generado_por_fkey"
            columns: ["generado_por"]
            isOneToOne: false
            referencedRelation: "administradores"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_contacto: {
        Row: {
          atendido: boolean
          correo: string
          fecha: string
          id: number
          mensaje: string
          nombre: string
        }
        Insert: {
          atendido?: boolean
          correo: string
          fecha?: string
          id?: number
          mensaje: string
          nombre: string
        }
        Update: {
          atendido?: boolean
          correo?: string
          fecha?: string
          id?: number
          mensaje?: string
          nombre?: string
        }
        Relationships: []
      }
      modulos: {
        Row: {
          archivo_pdf_url: string | null
          descripcion: string | null
          especialidad: string | null
          icono_url: string | null
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          archivo_pdf_url?: string | null
          descripcion?: string | null
          especialidad?: string | null
          icono_url?: string | null
          id?: number
          nombre: string
          orden?: number
        }
        Update: {
          archivo_pdf_url?: string | null
          descripcion?: string | null
          especialidad?: string | null
          icono_url?: string | null
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      ordenes_compra: {
        Row: {
          categoria: string
          correo_comprador: string
          estado: string
          fecha_compra: string
          id: number
          monto_centavos: number
          nombre_comprador: string
          precio_unitario_centavos: number
          precios_boleto_id: number | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          categoria?: string
          correo_comprador: string
          estado?: string
          fecha_compra?: string
          id?: number
          monto_centavos?: number
          nombre_comprador: string
          precio_unitario_centavos?: number
          precios_boleto_id?: number | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          categoria?: string
          correo_comprador?: string
          estado?: string
          fecha_compra?: string
          id?: number
          monto_centavos?: number
          nombre_comprador?: string
          precio_unitario_centavos?: number
          precios_boleto_id?: number | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_precios_boleto_id_fkey"
            columns: ["precios_boleto_id"]
            isOneToOne: false
            referencedRelation: "precios_boleto"
            referencedColumns: ["id"]
          },
        ]
      }
      patrocinadores: {
        Row: {
          id: number
          link_externo: string | null
          logo_url: string | null
          nivel: string | null
          nombre: string
        }
        Insert: {
          id?: number
          link_externo?: string | null
          logo_url?: string | null
          nivel?: string | null
          nombre: string
        }
        Update: {
          id?: number
          link_externo?: string | null
          logo_url?: string | null
          nivel?: string | null
          nombre?: string
        }
        Relationships: []
      }
      precios_boleto: {
        Row: {
          activo: boolean
          categoria: string
          fecha_modificacion: string
          id: number
          modificado_por: number | null
          moneda: string
          precio_centavos: number
          tipo_boleto: string
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          categoria: string
          fecha_modificacion?: string
          id?: number
          modificado_por?: number | null
          moneda?: string
          precio_centavos: number
          tipo_boleto?: string
          vigente_desde: string
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          fecha_modificacion?: string
          id?: number
          modificado_por?: number | null
          moneda?: string
          precio_centavos?: number
          tipo_boleto?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precios_boleto_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "administradores"
            referencedColumns: ["id"]
          },
        ]
      }
      // Parche manual -- tabla creada por
      // supabase/migrations/20260904090200_reenvios_boleto.sql, pendiente
      // de aplicar vía CLI (bloqueado en esta máquina, ver CLAUDE.md) y
      // regenerar con `supabase gen types typescript --linked`. Reemplazar
      // este bloque cuando eso ocurra.
      reenvios_boleto: {
        Row: {
          accion: string
          boleto_id: number
          detalle: string | null
          fecha: string
          id: number
          motivo: string
          password_hash_anterior: string | null
          resultado: string
        }
        Insert: {
          accion: string
          boleto_id: number
          detalle?: string | null
          fecha?: string
          id?: number
          motivo: string
          password_hash_anterior?: string | null
          resultado: string
        }
        Update: {
          accion?: string
          boleto_id?: number
          detalle?: string | null
          fecha?: string
          id?: number
          motivo?: string
          password_hash_anterior?: string | null
          resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "reenvios_boleto_boleto_id_fkey"
            columns: ["boleto_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          coordenadas: unknown
          direccion: string | null
          id: number
          imagen_url: string | null
          nombre: string
        }
        Insert: {
          coordenadas?: unknown
          direccion?: string | null
          id?: number
          imagen_url?: string | null
          nombre: string
        }
        Update: {
          coordenadas?: unknown
          direccion?: string | null
          id?: number
          imagen_url?: string | null
          nombre?: string
        }
        Relationships: []
      }
      sesiones_compra: {
        Row: {
          correo: string
          expira_en: string
          fecha_creacion: string
          id: number
          token_hash: string
        }
        Insert: {
          correo: string
          expira_en: string
          fecha_creacion?: string
          id?: number
          token_hash: string
        }
        Update: {
          correo?: string
          expira_en?: string
          fecha_creacion?: string
          id?: number
          token_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_crear_boleto_digital: {
        Args: {
          p_correo: string
          p_folio: string
          p_nombre: string
          p_orden_id: number
          p_password_hash: string
        }
        Returns: number
      }
      fn_marcar_orden_pagada: {
        Args: {
          p_amount_received_centavos: number
          p_payment_intent_id: string
        }
        Returns: {
          estado: string
          id: number
          ya_estaba_pagada: boolean
        }[]
      }
      fn_reservar_orden_digital: {
        Args: {
          p_categoria: string
          p_correo: string
          p_nombre: string
          p_precio_unitario_centavos: number
          p_precios_boleto_id: number
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
