from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from database import Base, engine


class Contract(Base):
    __tablename__ = "contracts"

    id_contrato = Column(String, primary_key=True)
    nombre_entidad = Column(String)
    nit_entidad = Column(String)
    departamento = Column(String)
    ciudad = Column(String)
    localizacion = Column(String)
    orden = Column(String)
    sector = Column(String)
    descripcion_del_proceso = Column(Text)
    objeto_del_contrato = Column(Text)
    tipo_de_contrato = Column(String)
    modalidad_de_contratacion = Column(String)
    justificacion_modalidad = Column(Text)
    fecha_de_firma = Column(String)
    fecha_de_inicio = Column(String)
    fecha_de_fin = Column(String)
    valor_del_contrato = Column(Float)
    dias_adicionados = Column(Integer)
    habilita_pago_adelantado = Column(String)
    proveedor_adjudicado = Column(String)
    documento_proveedor = Column(String)
    es_pyme = Column(String)
    estado_contrato = Column(String)
    urlproceso = Column(String)
    raw_json = Column(Text)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_contrato = Column(String, ForeignKey("contracts.id_contrato"))
    score_total = Column(Integer)
    score_reglas = Column(Integer)
    score_gpt = Column(Integer)
    nivel_riesgo = Column(String)
    resumen_ejecutivo = Column(Text)
    analisis_detallado = Column(Text)
    conclusiones = Column(Text)
    auditado_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_contrato = Column(String, ForeignKey("contracts.id_contrato"))
    tipo = Column(String)
    categoria = Column(String)
    titulo = Column(String)
    descripcion = Column(Text)
    severidad = Column(String)
    puntos = Column(Integer)


class Infographic(Base):
    __tablename__ = "infographics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_contrato = Column(String, ForeignKey("contracts.id_contrato"))
    imgbb_url = Column(Text)
    imgbb_delete_url = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_contrato = Column(String, ForeignKey("contracts.id_contrato"))
    file_path = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)


class TelegramUser(Base):
    __tablename__ = "telegram_users"

    chat_id = Column(String, primary_key=True)
    username = Column(String)
    response_format = Column(String, default="texto")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)
