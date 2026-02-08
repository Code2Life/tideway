{{- define "tideway.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tideway.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "tideway.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "tideway.redis.fullname" -}}
{{- printf "%s-redis" (include "tideway.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tideway.labels" -}}
app.kubernetes.io/name: {{ include "tideway.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end -}}

{{- define "tideway.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tideway.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
