"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  message,
  Row,
  Segmented,
  Space,
  Slider,
  Upload,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const basePath = process.env.basePath  || "";

const defaultValues = {
  id: "",
  name: "",
  type: "dynamic",
  content: "",
  expiresAt: null,
  colorDark: "#0f172a",
  colorLight: "#ffffff",
  size: 320,
  logoDataUrl: "",
  logoSizePercent: 20,
  logoRadius: 12,
};

const sizeOptions = [
  { label: "240px", value: 240 },
  { label: "320px", value: 320 },
  { label: "420px", value: 420 },
  { label: "560px", value: 560 },
];

const cardStyle = {
  background: "rgba(17, 24, 39, 0.92)",
  border: "1px solid #1f2937",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
  backdropFilter: "blur(10px)",
};

const parseChannel = (v) => Math.max(0, Math.min(255, Number(v) || 0));
function normalizeColor(color, fallback) {
  if (!color) return fallback;
  const c = color.trim();
  if (c.startsWith("#")) return c;
  const m = c.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (m) {
    const [r, g, b] = [parseChannel(m[1]), parseChannel(m[2]), parseChannel(m[3])];
    const hex = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return hex;
  }
  return fallback;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function overlayLogo(baseDataUrl, logoDataUrl, size, { logoSizePercent, logoRadius }) {
  if (!logoDataUrl) return baseDataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const baseImg = await loadImage(baseDataUrl);
  const logoImg = await loadImage(logoDataUrl);
  ctx.drawImage(baseImg, 0, 0, size, size);
  const logoSize = Math.max(24, size * (logoSizePercent || 20) * 0.01);
  const pos = (size - logoSize) / 2;
  const radius = Math.max(0, Math.min(logoRadius || 0, logoSize / 2));
  if (ctx.roundRect) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pos, pos, logoSize, logoSize, radius);
    ctx.clip();
    ctx.drawImage(logoImg, pos, pos, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.drawImage(logoImg, pos, pos, logoSize, logoSize);
  }
  return canvas.toDataURL("image/png");
}

async function buildQr(
  data,
  { colorDark, colorLight, size, logoDataUrl, logoSizePercent, logoRadius }
) {
  if (!data) return null;
  const base = await QRCode.toDataURL(data, {
    color: { dark: colorDark, light: colorLight },
    width: size,
    margin: 2,
  });
  return overlayLogo(base, logoDataUrl, size, { logoSizePercent, logoRadius });
}

export default function Home() {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form) || defaultValues;
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    form.setFieldsValue(defaultValues);
  }, [form]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function generate() {
      const shouldGate = values.type === "dynamic";
      const qrData =
        shouldGate && origin && values.id
          ? `${origin}${basePath}/api/qrs/${values.id}/resolve`
          : values.content;
      if (!qrData) {
        setPreview("");
        return;
      }
      try {
        const url = await buildQr(qrData, {
          colorDark: normalizeColor(values.colorDark, defaultValues.colorDark),
          colorLight: normalizeColor(values.colorLight, defaultValues.colorLight),
          size: values.size || defaultValues.size,
          logoDataUrl: values.logoDataUrl,
          logoSizePercent: values.logoSizePercent ?? defaultValues.logoSizePercent,
          logoRadius: values.logoRadius ?? defaultValues.logoRadius,
        });
        if (active) setPreview(url || "");
      } catch (err) {
        console.error(err);
        if (active) setPreview("");
      }
    }
    generate();
    return () => {
      active = false;
    };
  }, [
    values.id,
    values.content,
    values.colorDark,
    values.colorLight,
    values.size,
    values.logoDataUrl,
    values.logoSizePercent,
    values.logoRadius,
    values.expiresAt,
    values.type,
    origin,
  ]);

  const uploadProps = {
    showUploadList: false,
    maxCount: 1,
    accept: "image/*",
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        form.setFieldValue("logoDataUrl", e.target?.result?.toString() || "");
        message.success("Logo 已添加到二维码预览");
      };
      reader.readAsDataURL(file);
      return false;
    },
  };

  const handleSave = async () => {
    if (values.type !== "dynamic") {
      message.warning("静态码不入库，请直接下载使用");
      return;
    }
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        expiresAt: values.expiresAt ? values.expiresAt.toDate().toISOString() : null,
        logoSizePercent: values.logoSizePercent ?? defaultValues.logoSizePercent,
        logoRadius: values.logoRadius ?? defaultValues.logoRadius,
      };
      const res = await fetch(`${basePath}/api/qrs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      form.setFieldValue("id", saved.id);
      message.success("保存成功，已同步到管理列表");
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!preview) {
      message.warning("先填写内容生成预览");
      return;
    }
    const link = document.createElement("a");
    link.href = preview;
    link.download = `${values.name || "qr-code"}.png`;
    link.click();
  };

  const handleReset = () => {
    form.setFieldsValue(defaultValues);
    setPreview("");
  };

  return (
    <Space direction="vertical" size="large" className="page-stack">
      <div>
        <Title level={2} style={{ margin: 0, color: "#e5e7eb" }}>
          二维码生成器
        </Title>
        <Paragraph className="muted" style={{ marginTop: 6 }}>
          选择静态码或活码，设置过期时间、颜色、Logo 与尺寸，实时预览并下载 PNG。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            className="frosted-card"
            title="填写信息"
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            headStyle={{ borderBottom: "1px solid #1f2937" }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={defaultValues}
              onValuesChange={() => setPreview((p) => p)}
              requiredMark={false}
            >
              <Form.Item name="id" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="logoDataUrl" hidden>
                <Input type="hidden" />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="二维码名称"
                    name="name"
                    rules={[{ required: true, message: "请输入名称" }]}
                  >
                    <Input placeholder="如：活动报名码" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="过期时间（仅活码）" name="expiresAt">
                    <DatePicker
                      showTime
                      style={{ width: "100%" }}
                      placeholder="仅活码可设置过期"
                      disabled={values.type !== "dynamic"}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={values.type === "dynamic" ? "跳转内容 / 链接" : "内容 / 链接"}
                name="content"
                rules={[{ required: true, message: "请输入内容或链接" }]}
              >
                <TextArea rows={3} placeholder="https://example.com 或任意文本" />
              </Form.Item>

              <Row gutter={12} align="middle">
                <Col xs={24} md={8} lg={7}>
                  <Form.Item
                    label="二维码类型"
                    name="type"
                    rules={[{ required: true, message: "请选择类型" }]}
                  >
                    <Segmented
                      block
                      options={[
                        { label: "静态码", value: "static" },
                        { label: "活码", value: "dynamic" },
                      ]}
                      value={values.type || "dynamic"}
                      onChange={(val) => form.setFieldValue("type", val)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16} lg={17}>
                  <Form.Item label="样式" style={{ marginBottom: 0 }}>
                    <Space size="large" wrap align="center">
                      <Form.Item
                        label="前景色"
                        name="colorDark"
                        style={{ marginBottom: 0 }}
                      >
                        <ColorPicker
                          format="hex"
                          value={values.colorDark || defaultValues.colorDark}
                          onChange={(_, hex) => form.setFieldValue("colorDark", hex)}
                          presets={[
                            {
                              label: "深色",
                              colors: ["#0f172a", "#111827", "#1f2937", "#000000"],
                            },
                            {
                              label: "亮色",
                              colors: ["#10b981", "#14b8a6", "#2563eb", "#f97316"],
                            },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        label="背景色"
                        name="colorLight"
                        style={{ marginBottom: 0 }}
                      >
                        <ColorPicker
                          format="hex"
                          value={values.colorLight || defaultValues.colorLight}
                          onChange={(_, hex) => form.setFieldValue("colorLight", hex)}
                          presets={[
                            {
                              label: "浅色",
                              colors: ["#ffffff", "#f8fafc", "#e2e8f0", "#fef3c7"],
                            },
                            {
                              label: "对比",
                              colors: ["#0f172a", "#111827", "#1e293b", "#020617"],
                            },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item label="尺寸" name="size" style={{ marginBottom: 0 }}>
                        <Segmented
                          options={sizeOptions}
                          value={values.size || defaultValues.size}
                          onChange={(val) => form.setFieldValue("size", val)}
                        />
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Logo（可选）">
                <Form.Item style={{ marginBottom: 0 }}>
                  <Space size="large" wrap align="center">
                    <Form.Item
                      label={`大小 ${values.logoSizePercent}%`}
                      name="logoSizePercent"
                      style={{ marginBottom: 0, minWidth: 180 }}
                    >
                      <Slider
                        min={5}
                        max={50}
                        step={1}
                        tooltip={{ formatter: (v) => `${v}%` }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={`圆角 ${values.logoRadius}px`}
                      name="logoRadius"
                      style={{ marginBottom: 0, minWidth: 160 }}
                    >
                      <Slider min={0} max={50} step={1} tooltip={{ formatter: (v) => `${v}px` }} />
                    </Form.Item>
                  </Space>
                </Form.Item>
                <Space size="middle" align="center">
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>上传 Logo</Button>
                  </Upload>
                  {values.logoDataUrl && (
                    <>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => form.setFieldValue("logoDataUrl", "")}
                      >
                        移除
                      </Button>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid #1f2937",
                        }}
                      >
                        <img
                          src={values.logoDataUrl}
                          alt="logo preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    </>
                  )}
                </Space>
                {values.logoDataUrl && (
                  <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    已附加 Logo，预览会自动居中覆盖。
                  </Text>
                )}
              </Form.Item>

              <Space size="middle" wrap>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                  disabled={values.type !== "dynamic"}
                >
                  保存到管理列表
                </Button>
                {values.type !== "dynamic" && (
                  <Text type="secondary">静态码不入库，请直接下载使用</Text>
                )}
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            className="frosted-card"
            title="实时预览 & 下载"
            bordered={false}
            style={{ ...cardStyle, height: "100%" }}
            headStyle={{ borderBottom: "1px solid #1f2937" }}
          >
            <div className="preview">
              {preview ? (
                <img
                  src={preview}
                  alt="QR preview"
                  width={values.size || defaultValues.size}
                  height={values.size || defaultValues.size}
                />
              ) : (
                <Paragraph className="muted" style={{ marginTop: 12 }}>
                  输入内容后自动生成二维码预览
                </Paragraph>
              )}
              <Space>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  disabled={!preview}
                >
                  下载 PNG
                </Button>
              </Space>
            </div>
            {!preview && (
              <Alert
                style={{ marginTop: 16 }}
                message="提示"
                description="填写内容、选择颜色或上传 Logo，预览会自动更新。"
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
