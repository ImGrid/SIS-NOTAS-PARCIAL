PGDMP  ;                    }            PR_notas    17.4    17.4 k    E           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            F           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            G           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            H           1262    16388    PR_notas    DATABASE     p   CREATE DATABASE "PR_notas" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'es-ES';
    DROP DATABASE "PR_notas";
                     postgres    false            �            1259    16849 
   borradores    TABLE     Y  CREATE TABLE public.borradores (
    id integer NOT NULL,
    docente_id integer NOT NULL,
    grupo_id integer NOT NULL,
    contenido jsonb NOT NULL,
    observaciones text,
    progreso integer,
    ultima_modificacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    creado timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.borradores;
       public         heap r       postgres    false            �            1259    16848    borradores_id_seq    SEQUENCE     �   CREATE SEQUENCE public.borradores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public.borradores_id_seq;
       public               postgres    false    232            I           0    0    borradores_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public.borradores_id_seq OWNED BY public.borradores.id;
          public               postgres    false    231            �            1259    16740    calificaciones    TABLE       CREATE TABLE public.calificaciones (
    id integer NOT NULL,
    gestion integer NOT NULL,
    periodo character varying(255) NOT NULL,
    fecha date NOT NULL,
    asignatura character varying(255) NOT NULL,
    rubrica_id integer,
    docente_id integer,
    estudiante_id integer
);
 "   DROP TABLE public.calificaciones;
       public         heap r       postgres    false            �            1259    16739    calificaciones_id_seq    SEQUENCE     �   CREATE SEQUENCE public.calificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 ,   DROP SEQUENCE public.calificaciones_id_seq;
       public               postgres    false    226            J           0    0    calificaciones_id_seq    SEQUENCE OWNED BY     O   ALTER SEQUENCE public.calificaciones_id_seq OWNED BY public.calificaciones.id;
          public               postgres    false    225            �            1259    16814    codigos_verificacion    TABLE     �   CREATE TABLE public.codigos_verificacion (
    id integer NOT NULL,
    correo_electronico character varying(255),
    codigo character varying(6) NOT NULL,
    expiracion timestamp without time zone NOT NULL
);
 (   DROP TABLE public.codigos_verificacion;
       public         heap r       postgres    false            �            1259    16813    codigos_verificacion_id_seq    SEQUENCE     �   CREATE SEQUENCE public.codigos_verificacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 2   DROP SEQUENCE public.codigos_verificacion_id_seq;
       public               postgres    false    230            K           0    0    codigos_verificacion_id_seq    SEQUENCE OWNED BY     [   ALTER SEQUENCE public.codigos_verificacion_id_seq OWNED BY public.codigos_verificacion.id;
          public               postgres    false    229            �            1259    16390    docentes    TABLE     �   CREATE TABLE public.docentes (
    id integer NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    correo_electronico character varying(255) NOT NULL,
    cargo character varying(255)
);
    DROP TABLE public.docentes;
       public         heap r       postgres    false            �            1259    16389    docentes_id_seq    SEQUENCE     �   CREATE SEQUENCE public.docentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.docentes_id_seq;
       public               postgres    false    218            L           0    0    docentes_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.docentes_id_seq OWNED BY public.docentes.id;
          public               postgres    false    217            �            1259    16883    estudiante_grupo    TABLE     �   CREATE TABLE public.estudiante_grupo (
    id integer NOT NULL,
    estudiante_id integer NOT NULL,
    grupo_id integer NOT NULL,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true
);
 $   DROP TABLE public.estudiante_grupo;
       public         heap r       postgres    false            �            1259    16882    estudiante_grupo_id_seq    SEQUENCE     �   CREATE SEQUENCE public.estudiante_grupo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.estudiante_grupo_id_seq;
       public               postgres    false    236            M           0    0    estudiante_grupo_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.estudiante_grupo_id_seq OWNED BY public.estudiante_grupo.id;
          public               postgres    false    235            �            1259    16724    estudiantes    TABLE     <  CREATE TABLE public.estudiantes (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    apellido character varying(255) NOT NULL,
    codigo character varying(255) NOT NULL,
    carrera character varying(255) NOT NULL,
    semestre integer NOT NULL,
    unidad_educativa character varying(255)
);
    DROP TABLE public.estudiantes;
       public         heap r       postgres    false            �            1259    16723    estudiantes_id_seq    SEQUENCE     �   CREATE SEQUENCE public.estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.estudiantes_id_seq;
       public               postgres    false    224            N           0    0    estudiantes_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.estudiantes_id_seq OWNED BY public.estudiantes.id;
          public               postgres    false    223            �            1259    16559    grupos    TABLE     '  CREATE TABLE public.grupos (
    id integer NOT NULL,
    nombre_proyecto character varying(255) NOT NULL,
    carrera character varying(255) NOT NULL,
    semestre integer NOT NULL,
    docente_id integer,
    materia character varying(100) DEFAULT 'Sin asignar'::character varying NOT NULL
);
    DROP TABLE public.grupos;
       public         heap r       postgres    false            �            1259    16558    grupos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public.grupos_id_seq;
       public               postgres    false    220            O           0    0    grupos_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;
          public               postgres    false    219            �            1259    16928    habilitaciones_rubricas    TABLE     m  CREATE TABLE public.habilitaciones_rubricas (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    supervisor_id integer NOT NULL,
    motivo text NOT NULL,
    fecha_habilitacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    activa boolean DEFAULT true,
    fecha_desactivacion timestamp with time zone,
    supervisor_desactivacion_id integer
);
 +   DROP TABLE public.habilitaciones_rubricas;
       public         heap r       postgres    false            �            1259    16927    habilitaciones_rubricas_id_seq    SEQUENCE     �   CREATE SEQUENCE public.habilitaciones_rubricas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public.habilitaciones_rubricas_id_seq;
       public               postgres    false    238            P           0    0    habilitaciones_rubricas_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public.habilitaciones_rubricas_id_seq OWNED BY public.habilitaciones_rubricas.id;
          public               postgres    false    237            �            1259    16764    informes    TABLE     "  CREATE TABLE public.informes (
    id integer NOT NULL,
    grupo_id integer,
    estudiante_id integer,
    docente_id integer,
    calificacion_id integer,
    rubrica_id integer,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    comentarios_generales text
);
    DROP TABLE public.informes;
       public         heap r       postgres    false            �            1259    16763    informes_id_seq    SEQUENCE     �   CREATE SEQUENCE public.informes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.informes_id_seq;
       public               postgres    false    228            Q           0    0    informes_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.informes_id_seq OWNED BY public.informes.id;
          public               postgres    false    227            �            1259    16604    rubricas    TABLE     [  CREATE TABLE public.rubricas (
    id integer NOT NULL,
    presentacion numeric,
    sustentacion numeric,
    documentacion numeric,
    innovacion numeric,
    nota_final numeric,
    observaciones character varying(255),
    comentarios text,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    docente_id integer
);
    DROP TABLE public.rubricas;
       public         heap r       postgres    false            �            1259    16603    rubricas_id_seq    SEQUENCE     �   CREATE SEQUENCE public.rubricas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.rubricas_id_seq;
       public               postgres    false    222            R           0    0    rubricas_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.rubricas_id_seq OWNED BY public.rubricas.id;
          public               postgres    false    221            �            1259    16872    supervisores    TABLE     �   CREATE TABLE public.supervisores (
    id integer NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    correo_electronico character varying(255) NOT NULL,
    cargo character varying(100) NOT NULL
);
     DROP TABLE public.supervisores;
       public         heap r       postgres    false            �            1259    16871    supervisores_id_seq    SEQUENCE     �   CREATE SEQUENCE public.supervisores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.supervisores_id_seq;
       public               postgres    false    234            S           0    0    supervisores_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public.supervisores_id_seq OWNED BY public.supervisores.id;
          public               postgres    false    233            ]           2604    16852    borradores id    DEFAULT     n   ALTER TABLE ONLY public.borradores ALTER COLUMN id SET DEFAULT nextval('public.borradores_id_seq'::regclass);
 <   ALTER TABLE public.borradores ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    232    231    232            Y           2604    16743    calificaciones id    DEFAULT     v   ALTER TABLE ONLY public.calificaciones ALTER COLUMN id SET DEFAULT nextval('public.calificaciones_id_seq'::regclass);
 @   ALTER TABLE public.calificaciones ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    225    226    226            \           2604    16817    codigos_verificacion id    DEFAULT     �   ALTER TABLE ONLY public.codigos_verificacion ALTER COLUMN id SET DEFAULT nextval('public.codigos_verificacion_id_seq'::regclass);
 F   ALTER TABLE public.codigos_verificacion ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    230    229    230            S           2604    16393    docentes id    DEFAULT     j   ALTER TABLE ONLY public.docentes ALTER COLUMN id SET DEFAULT nextval('public.docentes_id_seq'::regclass);
 :   ALTER TABLE public.docentes ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    217    218    218            a           2604    16886    estudiante_grupo id    DEFAULT     z   ALTER TABLE ONLY public.estudiante_grupo ALTER COLUMN id SET DEFAULT nextval('public.estudiante_grupo_id_seq'::regclass);
 B   ALTER TABLE public.estudiante_grupo ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    236    235    236            X           2604    16727    estudiantes id    DEFAULT     p   ALTER TABLE ONLY public.estudiantes ALTER COLUMN id SET DEFAULT nextval('public.estudiantes_id_seq'::regclass);
 =   ALTER TABLE public.estudiantes ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    224    223    224            T           2604    16562 	   grupos id    DEFAULT     f   ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);
 8   ALTER TABLE public.grupos ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    220    219    220            d           2604    16931    habilitaciones_rubricas id    DEFAULT     �   ALTER TABLE ONLY public.habilitaciones_rubricas ALTER COLUMN id SET DEFAULT nextval('public.habilitaciones_rubricas_id_seq'::regclass);
 I   ALTER TABLE public.habilitaciones_rubricas ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    238    237    238            Z           2604    16767    informes id    DEFAULT     j   ALTER TABLE ONLY public.informes ALTER COLUMN id SET DEFAULT nextval('public.informes_id_seq'::regclass);
 :   ALTER TABLE public.informes ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    228    227    228            V           2604    16607    rubricas id    DEFAULT     j   ALTER TABLE ONLY public.rubricas ALTER COLUMN id SET DEFAULT nextval('public.rubricas_id_seq'::regclass);
 :   ALTER TABLE public.rubricas ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    222    221    222            `           2604    16875    supervisores id    DEFAULT     r   ALTER TABLE ONLY public.supervisores ALTER COLUMN id SET DEFAULT nextval('public.supervisores_id_seq'::regclass);
 >   ALTER TABLE public.supervisores ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    233    234    234            <          0    16849 
   borradores 
   TABLE DATA              COPY public.borradores (id, docente_id, grupo_id, contenido, observaciones, progreso, ultima_modificacion, creado) FROM stdin;
    public               postgres    false    232   /�       6          0    16740    calificaciones 
   TABLE DATA           x   COPY public.calificaciones (id, gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id) FROM stdin;
    public               postgres    false    226   L�       :          0    16814    codigos_verificacion 
   TABLE DATA           Z   COPY public.codigos_verificacion (id, correo_electronico, codigo, expiracion) FROM stdin;
    public               postgres    false    230   i�       .          0    16390    docentes 
   TABLE DATA           R   COPY public.docentes (id, nombre_completo, correo_electronico, cargo) FROM stdin;
    public               postgres    false    218   ��       @          0    16883    estudiante_grupo 
   TABLE DATA           a   COPY public.estudiante_grupo (id, estudiante_id, grupo_id, fecha_asignacion, activo) FROM stdin;
    public               postgres    false    236   ��       4          0    16724    estudiantes 
   TABLE DATA           h   COPY public.estudiantes (id, nombre, apellido, codigo, carrera, semestre, unidad_educativa) FROM stdin;
    public               postgres    false    224   ��       0          0    16559    grupos 
   TABLE DATA           ]   COPY public.grupos (id, nombre_proyecto, carrera, semestre, docente_id, materia) FROM stdin;
    public               postgres    false    220   ݋       B          0    16928    habilitaciones_rubricas 
   TABLE DATA           �   COPY public.habilitaciones_rubricas (id, grupo_id, supervisor_id, motivo, fecha_habilitacion, activa, fecha_desactivacion, supervisor_desactivacion_id) FROM stdin;
    public               postgres    false    238   ��       8          0    16764    informes 
   TABLE DATA           �   COPY public.informes (id, grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, fecha_creacion, comentarios_generales) FROM stdin;
    public               postgres    false    228   �       2          0    16604    rubricas 
   TABLE DATA           �   COPY public.rubricas (id, presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, fecha_creacion, docente_id) FROM stdin;
    public               postgres    false    222   4�       >          0    16872    supervisores 
   TABLE DATA           V   COPY public.supervisores (id, nombre_completo, correo_electronico, cargo) FROM stdin;
    public               postgres    false    234   Q�       T           0    0    borradores_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public.borradores_id_seq', 98, true);
          public               postgres    false    231            U           0    0    calificaciones_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public.calificaciones_id_seq', 284, true);
          public               postgres    false    225            V           0    0    codigos_verificacion_id_seq    SEQUENCE SET     J   SELECT pg_catalog.setval('public.codigos_verificacion_id_seq', 99, true);
          public               postgres    false    229            W           0    0    docentes_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public.docentes_id_seq', 12, true);
          public               postgres    false    217            X           0    0    estudiante_grupo_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public.estudiante_grupo_id_seq', 265, true);
          public               postgres    false    235            Y           0    0    estudiantes_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.estudiantes_id_seq', 243, true);
          public               postgres    false    223            Z           0    0    grupos_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.grupos_id_seq', 115, true);
          public               postgres    false    219            [           0    0    habilitaciones_rubricas_id_seq    SEQUENCE SET     M   SELECT pg_catalog.setval('public.habilitaciones_rubricas_id_seq', 15, true);
          public               postgres    false    237            \           0    0    informes_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.informes_id_seq', 284, true);
          public               postgres    false    227            ]           0    0    rubricas_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.rubricas_id_seq', 285, true);
          public               postgres    false    221            ^           0    0    supervisores_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.supervisores_id_seq', 1, true);
          public               postgres    false    233            z           2606    16860 -   borradores borradores_docente_id_grupo_id_key 
   CONSTRAINT     x   ALTER TABLE ONLY public.borradores
    ADD CONSTRAINT borradores_docente_id_grupo_id_key UNIQUE (docente_id, grupo_id);
 W   ALTER TABLE ONLY public.borradores DROP CONSTRAINT borradores_docente_id_grupo_id_key;
       public                 postgres    false    232    232            |           2606    16858    borradores borradores_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.borradores
    ADD CONSTRAINT borradores_pkey PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.borradores DROP CONSTRAINT borradores_pkey;
       public                 postgres    false    232            t           2606    16747 "   calificaciones calificaciones_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_pkey PRIMARY KEY (id);
 L   ALTER TABLE ONLY public.calificaciones DROP CONSTRAINT calificaciones_pkey;
       public                 postgres    false    226            x           2606    16819 .   codigos_verificacion codigos_verificacion_pkey 
   CONSTRAINT     l   ALTER TABLE ONLY public.codigos_verificacion
    ADD CONSTRAINT codigos_verificacion_pkey PRIMARY KEY (id);
 X   ALTER TABLE ONLY public.codigos_verificacion DROP CONSTRAINT codigos_verificacion_pkey;
       public                 postgres    false    230            h           2606    16399 (   docentes docentes_correo_electronico_key 
   CONSTRAINT     q   ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_correo_electronico_key UNIQUE (correo_electronico);
 R   ALTER TABLE ONLY public.docentes DROP CONSTRAINT docentes_correo_electronico_key;
       public                 postgres    false    218            j           2606    16397    docentes docentes_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.docentes DROP CONSTRAINT docentes_pkey;
       public                 postgres    false    218            �           2606    16890 &   estudiante_grupo estudiante_grupo_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public.estudiante_grupo
    ADD CONSTRAINT estudiante_grupo_pkey PRIMARY KEY (id);
 P   ALTER TABLE ONLY public.estudiante_grupo DROP CONSTRAINT estudiante_grupo_pkey;
       public                 postgres    false    236            p           2606    16733 "   estudiantes estudiantes_codigo_key 
   CONSTRAINT     _   ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_codigo_key UNIQUE (codigo);
 L   ALTER TABLE ONLY public.estudiantes DROP CONSTRAINT estudiantes_codigo_key;
       public                 postgres    false    224            r           2606    16731    estudiantes estudiantes_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.estudiantes DROP CONSTRAINT estudiantes_pkey;
       public                 postgres    false    224            l           2606    16566    grupos grupos_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);
 <   ALTER TABLE ONLY public.grupos DROP CONSTRAINT grupos_pkey;
       public                 postgres    false    220            �           2606    16937 4   habilitaciones_rubricas habilitaciones_rubricas_pkey 
   CONSTRAINT     r   ALTER TABLE ONLY public.habilitaciones_rubricas
    ADD CONSTRAINT habilitaciones_rubricas_pkey PRIMARY KEY (id);
 ^   ALTER TABLE ONLY public.habilitaciones_rubricas DROP CONSTRAINT habilitaciones_rubricas_pkey;
       public                 postgres    false    238            v           2606    16772    informes informes_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.informes DROP CONSTRAINT informes_pkey;
       public                 postgres    false    228            n           2606    16612    rubricas rubricas_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.rubricas
    ADD CONSTRAINT rubricas_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.rubricas DROP CONSTRAINT rubricas_pkey;
       public                 postgres    false    222            ~           2606    16881 0   supervisores supervisores_correo_electronico_key 
   CONSTRAINT     y   ALTER TABLE ONLY public.supervisores
    ADD CONSTRAINT supervisores_correo_electronico_key UNIQUE (correo_electronico);
 Z   ALTER TABLE ONLY public.supervisores DROP CONSTRAINT supervisores_correo_electronico_key;
       public                 postgres    false    234            �           2606    16879    supervisores supervisores_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.supervisores
    ADD CONSTRAINT supervisores_pkey PRIMARY KEY (id);
 H   ALTER TABLE ONLY public.supervisores DROP CONSTRAINT supervisores_pkey;
       public                 postgres    false    234            �           2606    16892 $   estudiante_grupo uq_estudiante_grupo 
   CONSTRAINT     r   ALTER TABLE ONLY public.estudiante_grupo
    ADD CONSTRAINT uq_estudiante_grupo UNIQUE (estudiante_id, grupo_id);
 N   ALTER TABLE ONLY public.estudiante_grupo DROP CONSTRAINT uq_estudiante_grupo;
       public                 postgres    false    236    236            �           1259    16955    idx_habilitaciones_activa    INDEX     _   CREATE INDEX idx_habilitaciones_activa ON public.habilitaciones_rubricas USING btree (activa);
 -   DROP INDEX public.idx_habilitaciones_activa;
       public                 postgres    false    238            �           1259    16953    idx_habilitaciones_grupo_id    INDEX     c   CREATE INDEX idx_habilitaciones_grupo_id ON public.habilitaciones_rubricas USING btree (grupo_id);
 /   DROP INDEX public.idx_habilitaciones_grupo_id;
       public                 postgres    false    238            �           1259    16954     idx_habilitaciones_supervisor_id    INDEX     m   CREATE INDEX idx_habilitaciones_supervisor_id ON public.habilitaciones_rubricas USING btree (supervisor_id);
 4   DROP INDEX public.idx_habilitaciones_supervisor_id;
       public                 postgres    false    238            �           2606    16861 %   borradores borradores_docente_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.borradores
    ADD CONSTRAINT borradores_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);
 O   ALTER TABLE ONLY public.borradores DROP CONSTRAINT borradores_docente_id_fkey;
       public               postgres    false    218    4714    232            �           2606    16866 #   borradores borradores_grupo_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.borradores
    ADD CONSTRAINT borradores_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);
 M   ALTER TABLE ONLY public.borradores DROP CONSTRAINT borradores_grupo_id_fkey;
       public               postgres    false    4716    220    232            �           2606    16753 -   calificaciones calificaciones_docente_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);
 W   ALTER TABLE ONLY public.calificaciones DROP CONSTRAINT calificaciones_docente_id_fkey;
       public               postgres    false    218    226    4714            �           2606    16758 0   calificaciones calificaciones_estudiante_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);
 Z   ALTER TABLE ONLY public.calificaciones DROP CONSTRAINT calificaciones_estudiante_id_fkey;
       public               postgres    false    226    4722    224            �           2606    16748 -   calificaciones calificaciones_rubrica_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_rubrica_id_fkey FOREIGN KEY (rubrica_id) REFERENCES public.rubricas(id);
 W   ALTER TABLE ONLY public.calificaciones DROP CONSTRAINT calificaciones_rubrica_id_fkey;
       public               postgres    false    222    226    4718            �           2606    16820 A   codigos_verificacion codigos_verificacion_correo_electronico_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.codigos_verificacion
    ADD CONSTRAINT codigos_verificacion_correo_electronico_fkey FOREIGN KEY (correo_electronico) REFERENCES public.docentes(correo_electronico);
 k   ALTER TABLE ONLY public.codigos_verificacion DROP CONSTRAINT codigos_verificacion_correo_electronico_fkey;
       public               postgres    false    4712    230    218            �           2606    16893    estudiante_grupo fk_estudiante    FK CONSTRAINT     �   ALTER TABLE ONLY public.estudiante_grupo
    ADD CONSTRAINT fk_estudiante FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);
 H   ALTER TABLE ONLY public.estudiante_grupo DROP CONSTRAINT fk_estudiante;
       public               postgres    false    4722    236    224            �           2606    16898    estudiante_grupo fk_grupo    FK CONSTRAINT     z   ALTER TABLE ONLY public.estudiante_grupo
    ADD CONSTRAINT fk_grupo FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);
 C   ALTER TABLE ONLY public.estudiante_grupo DROP CONSTRAINT fk_grupo;
       public               postgres    false    4716    236    220            �           2606    16938 /   habilitaciones_rubricas fk_habilitaciones_grupo    FK CONSTRAINT     �   ALTER TABLE ONLY public.habilitaciones_rubricas
    ADD CONSTRAINT fk_habilitaciones_grupo FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;
 Y   ALTER TABLE ONLY public.habilitaciones_rubricas DROP CONSTRAINT fk_habilitaciones_grupo;
       public               postgres    false    4716    238    220            �           2606    16943 4   habilitaciones_rubricas fk_habilitaciones_supervisor    FK CONSTRAINT     �   ALTER TABLE ONLY public.habilitaciones_rubricas
    ADD CONSTRAINT fk_habilitaciones_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.supervisores(id) ON DELETE CASCADE;
 ^   ALTER TABLE ONLY public.habilitaciones_rubricas DROP CONSTRAINT fk_habilitaciones_supervisor;
       public               postgres    false    238    234    4736            �           2606    16948 B   habilitaciones_rubricas fk_habilitaciones_supervisor_desactivacion    FK CONSTRAINT     �   ALTER TABLE ONLY public.habilitaciones_rubricas
    ADD CONSTRAINT fk_habilitaciones_supervisor_desactivacion FOREIGN KEY (supervisor_desactivacion_id) REFERENCES public.supervisores(id) ON DELETE SET NULL;
 l   ALTER TABLE ONLY public.habilitaciones_rubricas DROP CONSTRAINT fk_habilitaciones_supervisor_desactivacion;
       public               postgres    false    234    238    4736            �           2606    16567    grupos grupos_docente_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);
 G   ALTER TABLE ONLY public.grupos DROP CONSTRAINT grupos_docente_id_fkey;
       public               postgres    false    4714    218    220            �           2606    16788 &   informes informes_calificacion_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_calificacion_id_fkey FOREIGN KEY (calificacion_id) REFERENCES public.calificaciones(id);
 P   ALTER TABLE ONLY public.informes DROP CONSTRAINT informes_calificacion_id_fkey;
       public               postgres    false    228    226    4724            �           2606    16783 !   informes informes_docente_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);
 K   ALTER TABLE ONLY public.informes DROP CONSTRAINT informes_docente_id_fkey;
       public               postgres    false    218    228    4714            �           2606    16778 $   informes informes_estudiante_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);
 N   ALTER TABLE ONLY public.informes DROP CONSTRAINT informes_estudiante_id_fkey;
       public               postgres    false    228    224    4722            �           2606    16773    informes informes_grupo_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);
 I   ALTER TABLE ONLY public.informes DROP CONSTRAINT informes_grupo_id_fkey;
       public               postgres    false    228    220    4716            �           2606    16793 !   informes informes_rubrica_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_rubrica_id_fkey FOREIGN KEY (rubrica_id) REFERENCES public.rubricas(id);
 K   ALTER TABLE ONLY public.informes DROP CONSTRAINT informes_rubrica_id_fkey;
       public               postgres    false    222    228    4718            �           2606    16613 !   rubricas rubricas_docente_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.rubricas
    ADD CONSTRAINT rubricas_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);
 K   ALTER TABLE ONLY public.rubricas DROP CONSTRAINT rubricas_docente_id_fkey;
       public               postgres    false    218    4714    222            <      x������ � �      6      x������ � �      :      x������ � �      .      x������ � �      @      x������ � �      4      x������ � �      0      x������ � �      B      x������ � �      8      x������ � �      2      x������ � �      >      x������ � �     