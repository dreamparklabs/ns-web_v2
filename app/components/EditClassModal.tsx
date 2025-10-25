import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "../../convex/_generated/dataModel";

interface GradingCategory {
  name: string;
  weight: number;
  count: number;
  dropLowest?: number;
}

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: Id<"courses"> | null;
}

export default function EditClassModal({ isOpen, onClose, courseId }: EditClassModalProps) {
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [instructor, setInstructor] = useState("");
  const [creditHours, setCreditHours] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [deliveryFormat, setDeliveryFormat] = useState<"in-person" | "virtual" | "">("");
  const [deliveryMode, setDeliveryMode] = useState<"synchronous" | "asynchronous" | "">("");
  const [meetingDays, setMeetingDays] = useState<string[]>([]);
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [room, setRoom] = useState("");
  const [building, setBuilding] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Grading scheme state
  const [gradingMode, setGradingMode] = useState<"percentage" | "points">("percentage");
  const [gradingCategories, setGradingCategories] = useState<GradingCategory[]>([]);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useUser();
  const navigate = useNavigate();
  
  // Get user's terms for the dropdown
  const terms = useQuery(
    api.terms.getUserTermsByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  
  // Get course data for editing
  const course = useQuery(
    api.courses.getCourseById,
    courseId && user?.id ? { courseId, clerkUserId: user.id } : "skip"
  );
  
  // Mutations
  const updateCourse = useMutation(api.courses.updateCourse);

  // Populate form when course data loads
  useEffect(() => {
    if (course && isOpen) {
      setTitle(course.title);
      setCourseCode(course.code);
      setInstructor(course.instructor);
      setCreditHours(course.creditHours.toString());
      setSelectedTermId(course.termId);
      setDeliveryFormat((course.deliveryFormat as "in-person" | "virtual") || "in-person");
      setDeliveryMode((course.deliveryMode as "synchronous" | "asynchronous") || "");
      setMeetingDays(course.meetingDays || []);
      setMeetingStart(course.meetingStart || "");
      setMeetingEnd(course.meetingEnd || "");
      setRoom(course.room || "");
      setBuilding(course.building || "");
      
      // Populate grading scheme
      if (course.gradingScheme) {
        setGradingMode((course.gradingScheme.mode as "percentage" | "points") || "percentage");
        setGradingCategories(course.gradingScheme.categories || []);
      } else {
        setGradingMode("percentage");
        setGradingCategories([]);
      }
    }
  }, [course, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && !course) {
      setTitle("");
      setCourseCode("");
      setInstructor("");
      setCreditHours("");
      setSelectedTermId("");
      setDeliveryFormat("");
      setDeliveryMode("");
      setMeetingDays([]);
      setMeetingStart("");
      setMeetingEnd("");
      setRoom("");
      setBuilding("");
      setIsSubmitting(false);
      titleInputRef.current?.focus();
    }
  }, [isOpen, course]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId) return;
    
    // Basic required fields
    if (!title.trim() || !courseCode.trim() || !instructor.trim() || !creditHours || !selectedTermId || !deliveryFormat) return;
    
    // Conditional validation based on delivery format
    if (deliveryFormat === "in-person") {
      if (!meetingDays.length || !meetingStart || !meetingEnd || !room || !building) return;
    } else if (deliveryFormat === "virtual") {
      if (!deliveryMode) return;
      if (deliveryMode === "synchronous" && (!meetingDays.length || !meetingStart || !meetingEnd)) return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateCourse({
        courseId,
        title: title.trim(),
        code: courseCode.trim(),
        instructor: instructor.trim(),
        creditHours: parseInt(creditHours),
        termId: selectedTermId as any,
        deliveryFormat,
        deliveryMode: deliveryMode || undefined,
        meetingDays: meetingDays.length > 0 ? meetingDays : undefined,
        meetingStart: meetingStart || undefined,
        meetingEnd: meetingEnd || undefined,
        room: room || undefined,
        building: building || undefined,
        gradingScheme: gradingCategories.length > 0 ? {
          mode: gradingMode,
          categories: gradingCategories
        } : undefined,
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to update class:", error);
      alert("Failed to update class. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const weekDays = [
    { value: "M", label: "Mon" },
    { value: "T", label: "Tue" },
    { value: "W", label: "Wed" },
    { value: "R", label: "Thu" },
    { value: "F", label: "Fri" },
    { value: "S", label: "Sat" },
    { value: "U", label: "Sun" },
  ];

  const handleDayToggle = (day: string) => {
    setMeetingDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => weekDays.findIndex(w => w.value === a) - weekDays.findIndex(w => w.value === b))
    );
  };

  // Helper functions for grading scheme
  const addGradingCategory = () => {
    setGradingCategories([...gradingCategories, { 
      name: "", 
      weight: 0, 
      count: 1, 
      dropLowest: 0 
    }]);
  };

  const removeGradingCategory = (index: number) => {
    setGradingCategories(gradingCategories.filter((_, i) => i !== index));
  };

  const updateGradingCategory = (index: number, field: keyof GradingCategory, value: string | number) => {
    const updated = gradingCategories.map((cat, i) =>
      i === index ? { ...cat, [field]: value } : cat
    );
    setGradingCategories(updated);
  };

  const useSuggestedCategories = () => {
    setGradingCategories([
      { name: "Homework", weight: 30, count: 10, dropLowest: 1 },
      { name: "Quiz", weight: 20, count: 6, dropLowest: 1 },
      { name: "Test", weight: 25, count: 3, dropLowest: 0 },
      { name: "Final", weight: 25, count: 1, dropLowest: 0 }
    ]);
    setGradingMode("percentage");
  };

  const totalWeight = gradingCategories.reduce((sum, cat) => sum + cat.weight, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.16, 1, 0.3, 1], // Custom cubic bezier for smooth motion
              scale: { duration: 0.35 },
              y: { duration: 0.4 }
            }}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Class</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update class details and information</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Press</span>
              <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded border">
                <span className="font-mono font-medium">ESC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Class Name and Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Name *
              </label>
              <input
                ref={titleInputRef}
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Calculus II"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Code *
              </label>
              <input
                id="courseCode"
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g., MATH 201"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Instructor and Credits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instructor *
              </label>
              <input
                id="instructor"
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g., Prof. Johnson"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="creditHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credit Hours *
              </label>
              <input
                id="creditHours"
                type="number"
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                placeholder="3"
                min="1"
                max="6"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Term Selection */}
          <div>
            <label htmlFor="term" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Term *
            </label>
            <select
              id="term"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option value="">Select a term...</option>
              {terms?.map((term: any) => (
                <option key={term._id} value={term._id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Class Format *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deliveryFormat"
                  value="in-person"
                  checked={deliveryFormat === "in-person"}
                  onChange={(e) => {
                    setDeliveryFormat(e.target.value as "in-person");
                    setDeliveryMode(""); // Reset delivery mode when format changes
                  }}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">In-Person</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deliveryFormat"
                  value="virtual"
                  checked={deliveryFormat === "virtual"}
                  onChange={(e) => {
                    setDeliveryFormat(e.target.value as "virtual");
                    setDeliveryMode(""); // Reset delivery mode when format changes
                  }}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Virtual</span>
              </label>
            </div>
          </div>

          {/* Virtual Delivery Mode (only show if virtual is selected) */}
          {deliveryFormat === "virtual" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Virtual Class Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="synchronous"
                    checked={deliveryMode === "synchronous"}
                    onChange={(e) => setDeliveryMode(e.target.value as "synchronous")}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Synchronous (Live classes)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="asynchronous"
                    checked={deliveryMode === "asynchronous"}
                    onChange={(e) => setDeliveryMode(e.target.value as "asynchronous")}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Asynchronous (Self-paced)</span>
                </label>
              </div>
            </div>
          )}

          {/* Meeting Days - conditional based on format and mode */}
          {(deliveryFormat === "in-person" || (deliveryFormat === "virtual" && deliveryMode === "synchronous")) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Days {deliveryFormat === "in-person" || (deliveryFormat === "virtual" && deliveryMode === "synchronous") ? "*" : "(Optional)"}
              </label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    meetingDays.includes(day.value)
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            </div>
          )}

          {/* Meeting Times - conditional based on format and mode */}
          {(deliveryFormat === "in-person" || (deliveryFormat === "virtual" && deliveryMode === "synchronous")) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="meetingStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time {deliveryFormat === "in-person" || (deliveryFormat === "virtual" && deliveryMode === "synchronous") ? "*" : "(Optional)"}
              </label>
              <input
                id="meetingStart"
                type="time"
                value={meetingStart}
                onChange={(e) => setMeetingStart(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="meetingEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time {deliveryFormat === "in-person" || (deliveryFormat === "virtual" && deliveryMode === "synchronous") ? "*" : "(Optional)"}
              </label>
              <input
                id="meetingEnd"
                type="time"
                value={meetingEnd}
                onChange={(e) => setMeetingEnd(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Location - only show for in-person classes */}
          {deliveryFormat === "in-person" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room *
              </label>
              <input
                id="room"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g., Room 204"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="building" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Building *
              </label>
              <input
                id="building"
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g., Science Hall"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Grading Scheme Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Grading Scheme</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Define how assignments are weighted and graded</p>
              </div>
              <button
                type="button"
                onClick={useSuggestedCategories}
                className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                Use Suggested
              </button>
            </div>

            {/* Grading Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grading Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gradingMode"
                    value="percentage"
                    checked={gradingMode === "percentage"}
                    onChange={(e) => setGradingMode(e.target.value as "percentage")}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Percentage (weights must total 100%)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gradingMode"
                    value="points"
                    checked={gradingMode === "points"}
                    onChange={(e) => setGradingMode(e.target.value as "points")}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Points (total points per category)</span>
                </label>
              </div>
            </div>

            {/* Grading Categories */}
            <div className="space-y-3">
              {gradingCategories.map((category, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateGradingCategory(index, "name", e.target.value)}
                        placeholder="e.g., Homework"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {gradingMode === "percentage" ? "Weight (%)" : "Total Points"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={gradingMode === "percentage" ? "100" : undefined}
                        step={gradingMode === "percentage" ? "1" : "0.5"}
                        value={category.weight}
                        onChange={(e) => updateGradingCategory(index, "weight", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expected
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={category.count}
                        onChange={(e) => updateGradingCategory(index, "count", parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Drop Lowest
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={category.dropLowest || 0}
                        onChange={(e) => updateGradingCategory(index, "dropLowest", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => removeGradingCategory(index)}
                        className="w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addGradingCategory}
                className="w-full px-4 py-2.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Category
              </button>
            </div>

            {/* Weight Validation */}
            {gradingMode === "percentage" && gradingCategories.length > 0 && (
              <div className={`mt-3 p-3 rounded-lg ${
                totalWeight === 100 
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                  : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              }`}>
                <div className="flex items-center gap-2">
                  {totalWeight === 100 ? (
                    <>
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Total weight: {totalWeight}% ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Total weight: {totalWeight}% (must equal 100%)
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">ESC</kbd>
                to close
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  !title.trim() || 
                  !courseCode.trim() || 
                  !instructor.trim() || 
                  !creditHours || 
                  !selectedTermId || 
                  !deliveryFormat ||
                  (deliveryFormat === "in-person" && (!meetingDays.length || !meetingStart || !meetingEnd || !room || !building)) ||
                  (deliveryFormat === "virtual" && !deliveryMode) ||
                  (deliveryFormat === "virtual" && deliveryMode === "synchronous" && (!meetingDays.length || !meetingStart || !meetingEnd)) ||
                  isSubmitting
                }
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
