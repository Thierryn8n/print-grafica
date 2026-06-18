"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Loader2, Clock, Tag } from "lucide-react"
import { taskService, TASK_LABELS, getLabelColor, type OrderTask } from "@/lib/tasks/task-service"
import { format, parseISO, isPast } from "date-fns"
import { ptBR } from "date-fns/locale"

interface OrderTasksTabProps {
  orderId: string
  currentUserName?: string
}

export function OrderTasksTab({ orderId, currentUserName }: OrderTasksTabProps) {
  const [tasks, setTasks] = useState<OrderTask[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [label, setLabel] = useState<string>("none")
  const [dueAt, setDueAt] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setTasks(await taskService.list(orderId))
    } catch (e: any) {
      console.log("[v0] erro ao listar tarefas:", e?.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const unsub = taskService.subscribe(orderId, load)
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await taskService.create({
        orderId,
        title: title.trim(),
        label: label === "none" ? null : label,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        createdByName: currentUserName,
      })
      setTitle("")
      setLabel("none")
      setDueAt("")
      await load()
    } catch (e: any) {
      console.log("[v0] erro ao criar tarefa:", e?.message)
    }
    setSaving(false)
  }

  async function toggle(task: OrderTask) {
    await taskService.toggle(task.id, !task.done)
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
  }

  async function remove(id: string) {
    await taskService.remove(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const pending = tasks.filter((t) => !t.done)
  const completed = tasks.filter((t) => t.done)

  return (
    <div className="space-y-5">
      {/* Formulário de nova tarefa */}
      <div className="bg-muted/40 rounded-xl p-4 space-y-3">
        <Input
          placeholder="Nova tarefa (ex: Vetorizar logo do time)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <div className="flex flex-wrap gap-2">
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger className="w-[170px]">
              <Tag className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem etiqueta</SelectItem>
              {TASK_LABELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-[210px]"
          />

          <Button onClick={handleAdd} disabled={saving || !title.trim()} className="gap-2 ml-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma tarefa ainda. Crie tarefas para orientar os outros designers.
        </p>
      ) : (
        <div className="space-y-2">
          {[...pending, ...completed].map((task) => (
            <TaskRow key={task.id} task={task} onToggle={() => toggle(task)} onRemove={() => remove(task.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: OrderTask
  onToggle: () => void
  onRemove: () => void
}) {
  const overdue = task.dueAt && !task.done && isPast(parseISO(task.dueAt))
  return (
    <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-3">
      <Checkbox checked={task.done} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {task.label && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: getLabelColor(task.label) }}
            >
              {TASK_LABELS.find((l) => l.value === task.label)?.label ?? task.label}
            </span>
          )}
          {task.dueAt && (
            <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              <Clock className="h-3 w-3" />
              {format(parseISO(task.dueAt), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
          {task.createdByName && (
            <span className="text-[11px] text-muted-foreground">por {task.createdByName}</span>
          )}
        </div>
      </div>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remover tarefa</span>
      </Button>
    </div>
  )
}
