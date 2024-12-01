// src/app/components/FocusTasks.tsx
"use client";

import React, { useState, useEffect } from "react";

interface FocusTask {
  id: string;
  title: string;
  duration: number; // duration in minutes
  isCompleted: boolean;
  createdAt: Date;
}

export const FocusTasks: React.FC = () => {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [taskDuration, setTaskDuration] = useState(25); // Default 25 minutes

  useEffect(() => {
    const savedTasks = localStorage.getItem("focusTasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks).map((task: FocusTask) => ({
        ...task,
        createdAt: new Date(task.createdAt)
      })));
    }
  }, []);

  const saveTasks = (updatedTasks: FocusTask[]) => {
    localStorage.setItem("focusTasks", JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const newTaskItem: FocusTask = {
      id: Date.now().toString(),
      title: newTask,
      duration: taskDuration,
      isCompleted: false,
      createdAt: new Date()
    };

    saveTasks([...tasks, newTaskItem]);
    setNewTask("");
  };

  const handleToggleTask = (id: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
    );
    saveTasks(updatedTasks);
  };

  const handleRemoveTask = (id: string) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    saveTasks(updatedTasks);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Focus Tasks</h2>

      {/* Add new task form */}
      <form onSubmit={handleAddTask} className="mb-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What do you want to focus on?"
            className="flex-1 p-2 bg-gray-700 text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <select
            value={taskDuration}
            onChange={(e) => setTaskDuration(Number(e.target.value))}
            className="p-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-purple-500"
          >
            <option value={25}>25m</option>
            <option value={45}>45m</option>
            <option value={60}>60m</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* List of tasks */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            No focus tasks yet. Add one to get started!
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-gray-700 border border-gray-600 rounded"
            >
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={() => handleToggleTask(task.id)}
                  className="w-4 h-4 rounded border-gray-500 text-purple-600 focus:ring-purple-500 bg-gray-600"
                />
                <div className="flex flex-col">
                  <span className={`${task.isCompleted ? "line-through text-gray-400" : "text-white"}`}>
                    {task.title}
                  </span>
                  <span className="text-sm text-gray-400">
                    {task.duration} minutes focus time
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRemoveTask(task.id)}
                className="text-red-400 hover:text-red-300 transition-colors ml-4"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Summary section */}
      {tasks.length > 0 && (
        <div className="mt-6 p-4 bg-gray-700 rounded border border-gray-600">
          <h3 className="text-white font-semibold mb-2">Summary</h3>
          <div className="text-gray-300 space-y-1">
            <p>Total Tasks: {tasks.length}</p>
            <p>Completed: {tasks.filter(t => t.isCompleted).length}</p>
            <p>Total Focus Time: {tasks.reduce((acc, t) => acc + t.duration, 0)} minutes</p>
          </div>
        </div>
      )}
    </div>
  );
};