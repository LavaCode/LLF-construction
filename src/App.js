import { HashRouter as Router, Route, Routes, Navigate, useNavigate, useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import slugify from 'slugify';
import "./App.css";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function Home() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState("");
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomName, setEditingRoomName] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const loadRooms = async () => {
    const { data, error } = await supabase.from("rooms").select();
    if (!error) setRooms(data);
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const addRoom = async () => {
    if (newRoom.trim()) {
      const slug = slugify(newRoom, { lower: true });
      await supabase.from("rooms").insert({ name: newRoom, slug });
      setNewRoom("");
      loadRooms();
    }
  };

  const startEditing = (room) => {
    setEditingRoomId(room.id);
    setEditingRoomName(room.name);
  };

  const cancelEditing = () => {
    setEditingRoomId(null);
    setEditingRoomName("");
  };

  const saveEditing = async () => {
    if (editingRoomName.trim()) {
      await supabase.from("rooms").upsert({ id: editingRoomId, name: editingRoomName });
      setEditingRoomId(null);
      setEditingRoomName("");
      loadRooms();
    }
  };

  const deleteRoom = async (id) => {
    if (window.confirm("Delete this room?")) {
      await supabase.from("rooms").delete().eq("id", id);
      loadRooms();
    }
  };

  const checkPin = () => {
    if (pinInput === process.env.REACT_APP_PIN) {
      setEditMode(true);
      setPinInput("");
    } else {
      alert("Wrong PIN");
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">LLF - GALAXY</h1>
        <p className="app-subtitle">AV Integration Progress</p>
      </div>

      {!editMode && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Admin Access</h2>
          </div>
          <div className="card-content">
            <div className="form-group">
              <input
                type="password"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyPress={e => handleKeyPress(e, checkPin)}
                placeholder="Enter PIN"
                className="input"
              />
            </div>
            <button onClick={checkPin} className="btn btn-primary">
              Unlock
            </button>
          </div>
        </div>
      )}

      {editMode && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Add Room</h2>
          </div>
          <div className="card-content">
            <div className="form-group">
              <input
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
                onKeyPress={e => handleKeyPress(e, addRoom)}
                placeholder="Room name"
                className="input"
              />
            </div>
            <button onClick={addRoom} className="btn btn-success">
              Add Room
            </button>
          </div>
        </div>
      )}

      <div className="room-list">
        {rooms.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <h3 className="empty-state-title">No rooms</h3>
              <p className="empty-state-text">
                {editMode ? "Add your first room above" : "Enter PIN to add rooms"}
              </p>
            </div>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="room-item">
              {editingRoomId === room.id ? (
                <div className="card-content">
                  <div className="form-group">
                    <input
                      value={editingRoomName}
                      onChange={e => setEditingRoomName(e.target.value)}
                      onKeyPress={e => handleKeyPress(e, saveEditing)}
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEditing} className="btn btn-success btn-small">
                      Save
                    </button>
                    <button onClick={cancelEditing} className="btn btn-light btn-small">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="room-item-content">
                  <div
                    onClick={() => navigate(`/room/${slugify(room.name, { lower: true })}`)}
                    className="room-item-main"
                  >
                    <div>
                      <h3 className="room-name">{room.name}</h3>
                      <p className="room-subtitle">Tap to view tasks</p>
                    </div>
                  </div>
                  {editMode && (
                    <div className="room-actions">
                      <button
                        onClick={() => startEditing(room)}
                        className="room-action-btn edit"
                      >
                      </button>
                      <button
                        onClick={() => deleteRoom(room.id)}
                        className="room-action-btn delete"
                      >
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editMode && (
        <div className="text-center" style={{ marginTop: '16px' }}>
          <button
            onClick={() => setEditMode(false)}
            className="btn btn-light btn-small"
          >
            Lock Edit Mode
          </button>
        </div>
      )}
    </div>
  );
}

function Room() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const loadRoom = async () => {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("slug", roomName)
      .single();

    if (roomData) {
      document.title = roomData.name;
      setRoom(roomData);

      const { data: taskData } = await supabase
        .from("tasks")
        .select()
        .eq("room_id", roomData.id)
        .order("position", { ascending: true });

      setTasks(taskData || []);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [roomName]);

  const addTask = async () => {
    if (newTask.trim()) {
      const maxPosition = tasks.length > 0 ? Math.max(...tasks.map(t => t.position || 0)) : 0;
      await supabase.from("tasks").insert({
        title: newTask,
        done: false,
        room_id: room.id,
        position: maxPosition + 1,
      });
      setNewTask("");
      loadRoom();
    }
  };

  const toggleTask = async (task) => {
    await supabase.from("tasks").upsert({ id: task.id, done: !task.done });
    loadRoom();
  };

  const deleteTask = async (taskId) => {
    if (window.confirm("Delete this task?")) {
      await supabase.from("tasks").delete().eq("id", taskId);
      loadRoom();
    }
  };

  const unlockEditMode = () => {
    if (pinInput === process.env.REACT_APP_PIN) {
      setEditMode(true);
      setPinInput("");
    } else {
      alert("Wrong PIN");
    }
  };

  const goHome = () => {
    if (pin === process.env.REACT_APP_PIN) {
      navigate("/");
    } else {
      alert("Wrong PIN");
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(tasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setTasks(reordered);
    
    await Promise.all(
      reordered.map((task, index) =>
        supabase.from("tasks").upsert({ id: task.id, position: index })
      )
    );
  };

  if (!room) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="app-container">
      <div className="card">
        <div className="card-content">
          <div className="room-header">
            <h2>{room.name}</h2>
            <p>{completed} of {total} tasks done</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">{Math.round(progress)}% complete</p>
          </div>
        </div>
      </div>

      {!editMode && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Admin Access</h3>
          </div>
          <div className="card-content">
            <input
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && unlockEditMode()}
              placeholder="Enter PIN"
              type="password"
              className="input"
            />
            <button onClick={unlockEditMode} className="btn btn-primary">
              Unlock
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Add Task</h3>
        </div>
        <div className="card-content">
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addTask()}
            placeholder="Task description"
            className="input"
          />
          <button onClick={addTask} className="btn btn-success">
            Add Task
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-content">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state-title">No tasks</h3>
              <p className="empty-state-text">Add your first task above</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="task-list">
                    {tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`task-item ${task.done ? 'completed' : ''}`}
                          >
                            <div className="task-content">
                              <div
                                onClick={() => toggleTask(task)}
                                className={`task-checkbox ${task.done ? 'completed' : ''}`}
                              >
                                {task.done && '✓'}
                              </div>
                              <div
                                onClick={() => toggleTask(task)}
                                className={`task-text ${task.done ? 'completed' : ''}`}
                              >
                                {task.title}
                              </div>
                              <div {...provided.dragHandleProps} className="task-drag-handle">
                                ≡
                              </div>
                              {editMode && (
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="task-delete-btn"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-content">
          <button 
            onClick={() => setShowPin(!showPin)} 
            className="btn btn-secondary"
          >
            ← Back to Home
          </button>
          {showPin && (
            <div style={{ marginTop: '12px' }}>
              <input
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && goHome()}
                placeholder="Enter PIN"
                type="password"
                className="input"
              />
              <button onClick={goHome} className="btn btn-primary">
                Go Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomName" element={<Room />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}