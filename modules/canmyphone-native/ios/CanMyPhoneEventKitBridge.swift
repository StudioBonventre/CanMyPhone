import EventKit
import Foundation

actor CanMyPhoneEventKitBridge {
  static let shared = CanMyPhoneEventKitBridge()
  private let store = EKEventStore()

  func createCalendarEvent(title: String, start: String, end: String?, notes: String?) async -> [String: Any] {
    let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleanTitle.isEmpty, let startDate = parseDate(start) else {
      return failure("INVALID_EVENT", "Titel oder Startzeit des Kalendereintrags ist ungültig.")
    }

    guard await requestEventAccess() else {
      return failure("CALENDAR_PERMISSION_REQUIRED", "Kalenderzugriff ist nicht erlaubt.")
    }

    guard let calendar = store.defaultCalendarForNewEvents else {
      return failure("CALENDAR_UNAVAILABLE", "Es ist kein Kalender für neue Termine verfügbar.")
    }

    let event = EKEvent(eventStore: store)
    event.title = cleanTitle
    event.startDate = startDate
    event.endDate = end.flatMap(parseDate) ?? startDate.addingTimeInterval(3600)
    if event.endDate < event.startDate {
      return failure("INVALID_EVENT_RANGE", "Das Terminende liegt vor dem Beginn.")
    }
    event.notes = notes
    event.calendar = calendar

    do {
      try store.save(event, span: .thisEvent, commit: true)
      return [
        "success": true,
        "id": event.eventIdentifier ?? "",
        "message": "Kalendereintrag „\(cleanTitle)“ wurde erstellt."
      ]
    } catch {
      return failure("CALENDAR_SAVE_FAILED", "Der Kalendereintrag konnte nicht gespeichert werden.")
    }
  }

  func createReminder(title: String, due: String?, notes: String?) async -> [String: Any] {
    let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleanTitle.isEmpty else {
      return failure("INVALID_REMINDER", "Der Erinnerungstitel fehlt.")
    }

    guard await requestReminderAccess() else {
      return failure("REMINDER_PERMISSION_REQUIRED", "Erinnerungszugriff ist nicht erlaubt.")
    }

    guard let calendar = store.defaultCalendarForNewReminders() else {
      return failure("REMINDER_CALENDAR_UNAVAILABLE", "Es ist keine Liste für neue Erinnerungen verfügbar.")
    }

    let reminder = EKReminder(eventStore: store)
    reminder.title = cleanTitle
    reminder.notes = notes
    reminder.calendar = calendar
    if let due, let dueDate = parseDate(due) {
      reminder.dueDateComponents = Calendar.current.dateComponents(
        [.calendar, .timeZone, .year, .month, .day, .hour, .minute],
        from: dueDate
      )
    } else if due != nil {
      return failure("INVALID_REMINDER_DATE", "Die Fälligkeit der Erinnerung ist ungültig.")
    }

    do {
      try store.save(reminder, commit: true)
      return [
        "success": true,
        "id": reminder.calendarItemIdentifier,
        "message": "Erinnerung „\(cleanTitle)“ wurde erstellt."
      ]
    } catch {
      return failure("REMINDER_SAVE_FAILED", "Die Erinnerung konnte nicht gespeichert werden.")
    }
  }

  private func requestEventAccess() async -> Bool {
    if #available(iOS 17.0, *) {
      return (try? await store.requestFullAccessToEvents()) ?? false
    }
    return await withCheckedContinuation { continuation in
      store.requestAccess(to: .event) { granted, _ in
        continuation.resume(returning: granted)
      }
    }
  }

  private func requestReminderAccess() async -> Bool {
    if #available(iOS 17.0, *) {
      return (try? await store.requestFullAccessToReminders()) ?? false
    }
    return await withCheckedContinuation { continuation in
      store.requestAccess(to: .reminder) { granted, _ in
        continuation.resume(returning: granted)
      }
    }
  }

  private func parseDate(_ value: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: value) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: value)
  }

  private func failure(_ code: String, _ message: String) -> [String: Any] {
    ["success": false, "code": code, "message": message]
  }
}
