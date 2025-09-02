package untis;

import untis.beans.ClassBean;
import untis.beans.TeacherBean;
import untis.beans.TimeUnitBean;
import untis.utils.Utils;
import untis.utils.WebUntis;

import java.util.HashMap;
import java.util.List;

public class WebUntisAPI {

    public static void main(String[] args) {

        String sessionId = WebUntis.getSessionId();

        List<TeacherBean> teacherList = WebUntis.getTeacherList(sessionId);

        HashMap<Integer, TeacherBean> teacherMap = new HashMap<>();
        teacherList.forEach(bean -> teacherMap.put(bean.getId(), bean));

        List<ClassBean> classList = WebUntis.getClassList(sessionId);

        for (ClassBean classBean : classList) {
            List<TimeUnitBean> timeUnitList = WebUntis.getTimeUnitList(sessionId, classBean.getId());

            final long currentMillis = Utils.parseDate("02.09.2020 11:34");

            for (TimeUnitBean timeUnitBean : timeUnitList) {
                final long startMillis = Utils.convertToLong(timeUnitBean.getStartTime());
                final long endMillis = Utils.convertToLong(timeUnitBean.getEndTime());

                if (currentMillis >= startMillis && currentMillis <= endMillis) {
                    System.out.println("-------------------------------------");
                    System.out.println("Class: " + classBean.getName() + " (Long-Name: " + classBean.getLongName() + ")");
                    System.out.println("Time: " + Utils.beautifyTimeLong(timeUnitBean.getStartTime()) + " - " + Utils.beautifyTimeLong(timeUnitBean.getStartTime()) + " (Now: " + Utils.formatDate(currentMillis) + ")");
                    System.out.println("Teacher: " + TimeUnitBean.parseTeacher(timeUnitBean, teacherMap));
                    System.out.println("-------------------------------------");
                }
            }

        }
    }

}
